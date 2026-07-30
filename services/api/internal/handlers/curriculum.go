package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/utils"
)

// CurriculumHandler يخدم مسارات المنهاج للقراءة فقط (/grades, /subjects, /units, /lessons).
// الكتابة على المنهاج تتم حصرًا عبر /admin/* بعد دورة المراجعة (راجع docs/question-model.md).
type CurriculumHandler struct {
	db *pgxpool.Pool
}

func NewCurriculumHandler(db *pgxpool.Pool) *CurriculumHandler {
	return &CurriculumHandler{db: db}
}

type gradeDTO struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Level int    `json:"level"`
}

func (h *CurriculumHandler) ListGrades(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.Context(), `
		SELECT id, name, level FROM grades WHERE is_active = true ORDER BY level
	`)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب الصفوف")
	}
	defer rows.Close()

	grades := []gradeDTO{}
	for rows.Next() {
		var g gradeDTO
		if err := rows.Scan(&g.ID, &g.Name, &g.Level); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة بيانات الصفوف")
		}
		grades = append(grades, g)
	}
	return c.JSON(grades)
}

type subjectDTO struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

func (h *CurriculumHandler) ListSubjectsForGrade(c *fiber.Ctx) error {
	gradeID := c.Params("gradeId")
	rows, err := h.db.Query(c.Context(), `
		SELECT id, name, slug FROM subjects WHERE grade_id = $1 AND is_active = true
	`, gradeID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب المواد")
	}
	defer rows.Close()

	subjects := []subjectDTO{}
	for rows.Next() {
		var s subjectDTO
		if err := rows.Scan(&s.ID, &s.Name, &s.Slug); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة بيانات المواد")
		}
		subjects = append(subjects, s)
	}
	return c.JSON(subjects)
}

func (h *CurriculumHandler) GetSubject(c *fiber.Ctx) error {
	subjectID := c.Params("subjectId")
	var s subjectDTO
	err := h.db.QueryRow(c.Context(), `
		SELECT id, name, slug FROM subjects WHERE id = $1
	`, subjectID).Scan(&s.ID, &s.Name, &s.Slug)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "المادة غير موجودة")
	}
	return c.JSON(s)
}

type unitDTO struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Order int    `json:"order"`
}

func (h *CurriculumHandler) ListUnits(c *fiber.Ctx) error {
	subjectID := c.Params("subjectId")
	rows, err := h.db.Query(c.Context(), `
		SELECT id, name, "order" FROM units WHERE subject_id = $1 AND is_active = true ORDER BY "order"
	`, subjectID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب الوحدات")
	}
	defer rows.Close()

	units := []unitDTO{}
	for rows.Next() {
		var u unitDTO
		if err := rows.Scan(&u.ID, &u.Name, &u.Order); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة بيانات الوحدات")
		}
		units = append(units, u)
	}
	return c.JSON(units)
}

type lessonDTO struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Summary string `json:"summary,omitempty"`
	Order   int    `json:"order"`
}

func (h *CurriculumHandler) ListLessons(c *fiber.Ctx) error {
	unitID := c.Params("unitId")
	rows, err := h.db.Query(c.Context(), `
		SELECT id, name, COALESCE(summary, ''), "order" FROM lessons
		WHERE unit_id = $1 AND is_active = true ORDER BY "order"
	`, unitID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب الدروس")
	}
	defer rows.Close()

	lessons := []lessonDTO{}
	for rows.Next() {
		var l lessonDTO
		if err := rows.Scan(&l.ID, &l.Name, &l.Summary, &l.Order); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة بيانات الدروس")
		}
		lessons = append(lessons, l)
	}
	return c.JSON(lessons)
}

func (h *CurriculumHandler) GetLesson(c *fiber.Ctx) error {
	lessonID := c.Params("lessonId")
	var l lessonDTO
	err := h.db.QueryRow(c.Context(), `
		SELECT id, name, COALESCE(summary, ''), "order" FROM lessons WHERE id = $1
	`, lessonID).Scan(&l.ID, &l.Name, &l.Summary, &l.Order)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "الدرس غير موجود")
	}
	return c.JSON(l)
}

type quizRefDTO struct {
	ID    string `json:"id"`
	Type  string `json:"type"`
	Title string `json:"title"`
}

// GetLessonQuiz يعيد اختبار الدرس (إن وُجد) — يسمح لزر "اختبر نفسك الآن"
// في صفحة الدرس بمعرفة أي quizId يبدأ عبر POST /quizzes/{quizId}/start.
func (h *CurriculumHandler) GetLessonQuiz(c *fiber.Ctx) error {
	lessonID := c.Params("lessonId")
	var q quizRefDTO
	err := h.db.QueryRow(c.Context(), `
		SELECT id, quiz_type, title FROM quizzes
		WHERE lesson_id = $1 AND is_active = true
		ORDER BY created_at LIMIT 1
	`, lessonID).Scan(&q.ID, &q.Type, &q.Title)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "لا يوجد اختبار لهذا الدرس بعد")
	}
	return c.JSON(q)
}
