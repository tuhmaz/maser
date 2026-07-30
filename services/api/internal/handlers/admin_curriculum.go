package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/audit"
	"github.com/alemedu/api/internal/middleware"
	"github.com/alemedu/api/internal/utils"
)

// AdminCurriculumHandler يدير الوحدات والدروس والمهارات — إنشاء المحتوى الفعلي
// للنطاق التجريبي الحالي (الصف السابع / الرياضيات). إضافة صفوف/مواد جديدة
// مؤجَّلة لمرحلة التوسع (docs/product-requirements.md، خطة التوسع).
type AdminCurriculumHandler struct {
	db *pgxpool.Pool
}

func NewAdminCurriculumHandler(db *pgxpool.Pool) *AdminCurriculumHandler {
	return &AdminCurriculumHandler{db: db}
}

// --- الوحدات ---

type adminUnitDTO struct {
	ID        string `json:"id"`
	SubjectID string `json:"subjectId"`
	Name      string `json:"name"`
	Order     int    `json:"order"`
	IsActive  bool   `json:"isActive"`
}

func (h *AdminCurriculumHandler) ListUnits(c *fiber.Ctx) error {
	subjectID := c.Query("subjectId")
	query := `SELECT id, subject_id, name, "order", is_active FROM units`
	args := []any{}
	if subjectID != "" {
		query += ` WHERE subject_id = $1`
		args = append(args, subjectID)
	}
	query += ` ORDER BY subject_id, "order"`

	rows, err := h.db.Query(c.Context(), query, args...)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب الوحدات")
	}
	defer rows.Close()

	units := []adminUnitDTO{}
	for rows.Next() {
		var u adminUnitDTO
		if err := rows.Scan(&u.ID, &u.SubjectID, &u.Name, &u.Order, &u.IsActive); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة الوحدات")
		}
		units = append(units, u)
	}
	return c.JSON(units)
}

type saveUnitRequest struct {
	SubjectID string `json:"subjectId"`
	Name      string `json:"name"`
	Order     int    `json:"order"`
	IsActive  *bool  `json:"isActive"`
}

func (h *AdminCurriculumHandler) CreateUnit(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	var req saveUnitRequest
	if err := c.BodyParser(&req); err != nil || req.SubjectID == "" || req.Name == "" {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error", "subjectId و name مطلوبان")
	}
	if req.Order == 0 {
		req.Order = 1
	}

	var id string
	err := h.db.QueryRow(c.Context(), `
		INSERT INTO units (subject_id, name, "order") VALUES ($1, $2, $3) RETURNING id
	`, req.SubjectID, req.Name, req.Order).Scan(&id)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "invalid_subject", "تعذّر إنشاء الوحدة — تأكد من صحة المادة")
	}
	audit.Log(c.Context(), h.db, userID, "unit.create", "unit", id, map[string]any{"name": req.Name})
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"id": id})
}

func (h *AdminCurriculumHandler) UpdateUnit(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	id := c.Params("id")
	var req saveUnitRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "invalid_body", "تعذّرت قراءة الطلب")
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	tag, err := h.db.Exec(c.Context(), `
		UPDATE units SET name = COALESCE(NULLIF($2, ''), name), "order" = COALESCE(NULLIF($3, 0), "order"), is_active = $4
		WHERE id = $1
	`, id, req.Name, req.Order, isActive)
	if err != nil || tag.RowsAffected() == 0 {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "الوحدة غير موجودة")
	}
	audit.Log(c.Context(), h.db, userID, "unit.update", "unit", id, nil)
	return c.JSON(fiber.Map{"updated": true})
}

// --- الدروس ---

type adminLessonDTO struct {
	ID       string `json:"id"`
	UnitID   string `json:"unitId"`
	Name     string `json:"name"`
	Summary  string `json:"summary,omitempty"`
	Order    int    `json:"order"`
	IsActive bool   `json:"isActive"`
}

func (h *AdminCurriculumHandler) ListLessons(c *fiber.Ctx) error {
	unitID := c.Query("unitId")
	query := `SELECT id, unit_id, name, COALESCE(summary, ''), "order", is_active FROM lessons`
	args := []any{}
	if unitID != "" {
		query += ` WHERE unit_id = $1`
		args = append(args, unitID)
	}
	query += ` ORDER BY unit_id, "order"`

	rows, err := h.db.Query(c.Context(), query, args...)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب الدروس")
	}
	defer rows.Close()

	lessons := []adminLessonDTO{}
	for rows.Next() {
		var l adminLessonDTO
		if err := rows.Scan(&l.ID, &l.UnitID, &l.Name, &l.Summary, &l.Order, &l.IsActive); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة الدروس")
		}
		lessons = append(lessons, l)
	}
	return c.JSON(lessons)
}

type saveLessonRequest struct {
	UnitID   string `json:"unitId"`
	Name     string `json:"name"`
	Summary  string `json:"summary"`
	Order    int    `json:"order"`
	IsActive *bool  `json:"isActive"`
}

func (h *AdminCurriculumHandler) CreateLesson(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	var req saveLessonRequest
	if err := c.BodyParser(&req); err != nil || req.UnitID == "" || req.Name == "" {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error", "unitId و name مطلوبان")
	}
	if req.Order == 0 {
		req.Order = 1
	}
	var id string
	err := h.db.QueryRow(c.Context(), `
		INSERT INTO lessons (unit_id, name, summary, "order") VALUES ($1, $2, NULLIF($3, ''), $4) RETURNING id
	`, req.UnitID, req.Name, req.Summary, req.Order).Scan(&id)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "invalid_unit", "تعذّر إنشاء الدرس — تأكد من صحة الوحدة")
	}
	audit.Log(c.Context(), h.db, userID, "lesson.create", "lesson", id, map[string]any{"name": req.Name})
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"id": id})
}

func (h *AdminCurriculumHandler) UpdateLesson(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	id := c.Params("id")
	var req saveLessonRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "invalid_body", "تعذّرت قراءة الطلب")
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	tag, err := h.db.Exec(c.Context(), `
		UPDATE lessons SET
			name = COALESCE(NULLIF($2, ''), name),
			summary = COALESCE(NULLIF($3, ''), summary),
			"order" = COALESCE(NULLIF($4, 0), "order"),
			is_active = $5
		WHERE id = $1
	`, id, req.Name, req.Summary, req.Order, isActive)
	if err != nil || tag.RowsAffected() == 0 {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "الدرس غير موجود")
	}
	audit.Log(c.Context(), h.db, userID, "lesson.update", "lesson", id, nil)
	return c.JSON(fiber.Map{"updated": true})
}

// --- المهارات ---

type adminSkillDTO struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description,omitempty"`
	Difficulty  string   `json:"difficulty"`
	LessonIDs   []string `json:"lessonIds"`
}

func (h *AdminCurriculumHandler) ListSkills(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.Context(), `
		SELECT sk.id, sk.name, COALESCE(sk.description, ''), sk.difficulty,
		       COALESCE(array_agg(ls.lesson_id) FILTER (WHERE ls.lesson_id IS NOT NULL), '{}')
		FROM skills sk
		LEFT JOIN lesson_skills ls ON ls.skill_id = sk.id
		GROUP BY sk.id, sk.name, sk.description, sk.difficulty
		ORDER BY sk.name
	`)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب المهارات")
	}
	defer rows.Close()

	skills := []adminSkillDTO{}
	for rows.Next() {
		var s adminSkillDTO
		if err := rows.Scan(&s.ID, &s.Name, &s.Description, &s.Difficulty, &s.LessonIDs); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة المهارات")
		}
		skills = append(skills, s)
	}
	return c.JSON(skills)
}

type saveSkillRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Difficulty  string `json:"difficulty"`
	LessonID    string `json:"lessonId"` // اختياري: يربط المهارة بدرس عند الإنشاء
}

func (h *AdminCurriculumHandler) CreateSkill(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	var req saveSkillRequest
	if err := c.BodyParser(&req); err != nil || req.Name == "" {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error", "name مطلوب")
	}
	if req.Difficulty == "" {
		req.Difficulty = "medium"
	}
	if req.Difficulty != "easy" && req.Difficulty != "medium" && req.Difficulty != "hard" {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error", "difficulty يجب أن تكون easy/medium/hard")
	}

	var id string
	err := h.db.QueryRow(c.Context(), `
		INSERT INTO skills (name, description, difficulty) VALUES ($1, NULLIF($2, ''), $3) RETURNING id
	`, req.Name, req.Description, req.Difficulty).Scan(&id)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر إنشاء المهارة")
	}
	if req.LessonID != "" {
		if _, err := h.db.Exec(c.Context(), `
			INSERT INTO lesson_skills (lesson_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING
		`, req.LessonID, id); err != nil {
			return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "invalid_lesson", "تعذّر ربط المهارة بالدرس")
		}
	}
	audit.Log(c.Context(), h.db, userID, "skill.create", "skill", id, map[string]any{"name": req.Name})
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"id": id})
}

func (h *AdminCurriculumHandler) UpdateSkill(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	id := c.Params("id")
	var req saveSkillRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "invalid_body", "تعذّرت قراءة الطلب")
	}
	tag, err := h.db.Exec(c.Context(), `
		UPDATE skills SET
			name = COALESCE(NULLIF($2, ''), name),
			description = COALESCE(NULLIF($3, ''), description),
			difficulty = COALESCE(NULLIF($4, ''), difficulty),
			updated_at = now()
		WHERE id = $1
	`, id, req.Name, req.Description, req.Difficulty)
	if err != nil || tag.RowsAffected() == 0 {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "المهارة غير موجودة")
	}
	if req.LessonID != "" {
		if _, err := h.db.Exec(c.Context(), `
			INSERT INTO lesson_skills (lesson_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING
		`, req.LessonID, id); err != nil {
			return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "invalid_lesson", "تعذّر ربط المهارة بالدرس")
		}
	}
	audit.Log(c.Context(), h.db, userID, "skill.update", "skill", id, nil)
	return c.JSON(fiber.Map{"updated": true})
}

// --- الاختبارات (للقراءة فقط: تُنشأ تلقائيًا عند نشر أول سؤال في الدرس) ---

type adminQuizDTO struct {
	ID            string `json:"id"`
	LessonID      string `json:"lessonId"`
	LessonName    string `json:"lessonName"`
	Title         string `json:"title"`
	QuestionCount int    `json:"questionCount"`
}

func (h *AdminCurriculumHandler) ListQuizzes(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.Context(), `
		SELECT q.id, q.lesson_id, l.name, q.title, COUNT(qq.question_id)
		FROM quizzes q
		JOIN lessons l ON l.id = q.lesson_id
		LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
		GROUP BY q.id, q.lesson_id, l.name, q.title
		ORDER BY l.name
	`)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب الاختبارات")
	}
	defer rows.Close()

	quizzes := []adminQuizDTO{}
	for rows.Next() {
		var q adminQuizDTO
		if err := rows.Scan(&q.ID, &q.LessonID, &q.LessonName, &q.Title, &q.QuestionCount); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة الاختبارات")
		}
		quizzes = append(quizzes, q)
	}
	return c.JSON(quizzes)
}
