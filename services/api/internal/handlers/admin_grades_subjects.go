package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/audit"
	"github.com/alemedu/api/internal/middleware"
	"github.com/alemedu/api/internal/utils"
)

// AdminGradesSubjectsHandler يدير إنشاء صفوف ومواد جديدة — مرحلة التوسع
// (docs/product-requirements.md §خطة التوسع: "التوسع صفًا/مادة بعد إثبات الاستخدام").
// يُبقي الصف/المادة التجريبيين الأصليين كما هما دون أي تأثير.
type AdminGradesSubjectsHandler struct {
	db *pgxpool.Pool
}

func NewAdminGradesSubjectsHandler(db *pgxpool.Pool) *AdminGradesSubjectsHandler {
	return &AdminGradesSubjectsHandler{db: db}
}

type adminGradeDTO struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Level    int    `json:"level"`
	IsActive bool   `json:"isActive"`
}

func (h *AdminGradesSubjectsHandler) ListGrades(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.Context(), `
		SELECT id, name, level, is_active FROM grades ORDER BY level
	`)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب الصفوف")
	}
	defer rows.Close()
	grades := []adminGradeDTO{}
	for rows.Next() {
		var g adminGradeDTO
		if err := rows.Scan(&g.ID, &g.Name, &g.Level, &g.IsActive); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة الصفوف")
		}
		grades = append(grades, g)
	}
	return c.JSON(grades)
}

type createGradeRequest struct {
	Name  string `json:"name"`
	Level int    `json:"level"`
}

// CreateGrade ينشئ صفًا جديدًا ضمن منهاج التجربة الحالي (الأردن)، مع سنة دراسية
// وفصل أول تلقائيًا إن لم يوجدا بعد لهذا المنهاج — حتى يصبح جاهزًا لإنشاء مواد فورًا.
func (h *AdminGradesSubjectsHandler) CreateGrade(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	var req createGradeRequest
	if err := c.BodyParser(&req); err != nil || req.Name == "" || req.Level < 1 {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error", "name و level (رقم موجب) مطلوبان")
	}

	var curriculumID string
	if err := h.db.QueryRow(c.Context(), `SELECT id FROM curricula LIMIT 1`).Scan(&curriculumID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "لا يوجد منهاج معتمد بعد")
	}

	var id string
	err := h.db.QueryRow(c.Context(), `
		INSERT INTO grades (curriculum_id, name, level, is_active) VALUES ($1, $2, $3, true) RETURNING id
	`, curriculumID, req.Name, req.Level).Scan(&id)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر إنشاء الصف")
	}
	audit.Log(c.Context(), h.db, userID, "grade.create", "grade", id, map[string]any{"name": req.Name, "level": req.Level})
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"id": id})
}

type createSubjectRequest struct {
	GradeID string `json:"gradeId"`
	Name    string `json:"name"`
	Slug    string `json:"slug"`
}

// CreateSubject ينشئ مادة ضمن صف — يستخدم أول سنة دراسية/فصل متاحين لمنهاج الصف
// (إن لم يوجد فصل بعد يُنشأ فصل أول تلقائيًا) حتى لا يحتاج الأدمن لإدارة تلك
// الكيانات الوسيطة يدويًا في هذه المرحلة.
func (h *AdminGradesSubjectsHandler) CreateSubject(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	var req createSubjectRequest
	if err := c.BodyParser(&req); err != nil || req.GradeID == "" || req.Name == "" || req.Slug == "" {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error", "gradeId و name و slug مطلوبة")
	}

	tx, err := h.db.Begin(c.Context())
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر بدء العملية")
	}
	defer tx.Rollback(c.Context())

	var curriculumID string
	if err := tx.QueryRow(c.Context(), `SELECT curriculum_id FROM grades WHERE id = $1`, req.GradeID).Scan(&curriculumID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "الصف غير موجود")
	}

	var semesterID string
	err = tx.QueryRow(c.Context(), `
		SELECT s.id FROM semesters s
		JOIN academic_years ay ON ay.id = s.academic_year_id
		WHERE ay.curriculum_id = $1
		ORDER BY ay.start_date DESC NULLS LAST, s."order" LIMIT 1
	`, curriculumID).Scan(&semesterID)
	if err != nil {
		// لا يوجد فصل بعد لهذا المنهاج — أنشئ سنة دراسية وفصلًا أول تلقائيًا
		var yearID string
		if err := tx.QueryRow(c.Context(), `
			INSERT INTO academic_years (curriculum_id, name) VALUES ($1, 'السنة الحالية') RETURNING id
		`, curriculumID).Scan(&yearID); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر إنشاء سنة دراسية")
		}
		if err := tx.QueryRow(c.Context(), `
			INSERT INTO semesters (academic_year_id, name, "order") VALUES ($1, 'الفصل الأول', 1) RETURNING id
		`, yearID).Scan(&semesterID); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر إنشاء فصل دراسي")
		}
	}

	var id string
	if err := tx.QueryRow(c.Context(), `
		INSERT INTO subjects (grade_id, semester_id, name, slug, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id
	`, req.GradeID, semesterID, req.Name, req.Slug).Scan(&id); err != nil {
		return utils.ErrorResponse(c, fiber.StatusConflict, "duplicate_subject", "قد تكون هذه المادة موجودة بالفعل لهذا الصف والفصل")
	}

	if err := tx.Commit(c.Context()); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر حفظ المادة")
	}
	audit.Log(c.Context(), h.db, userID, "subject.create", "subject", id, map[string]any{"name": req.Name, "gradeId": req.GradeID})
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"id": id})
}
