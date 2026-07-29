package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/middleware"
	"github.com/alemedu/api/internal/utils"
)

type OnboardingHandler struct {
	db *pgxpool.Pool
}

func NewOnboardingHandler(db *pgxpool.Pool) *OnboardingHandler {
	return &OnboardingHandler{db: db}
}

// Options يعيد الصفوف النشطة وموادها دفعة واحدة لشاشة التهيئة.
func (h *OnboardingHandler) Options(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.Context(), `
		SELECT g.id, g.name, g.level, s.id, s.name, s.slug
		FROM grades g
		JOIN subjects s ON s.grade_id = g.id AND s.is_active = true
		WHERE g.is_active = true
		ORDER BY g.level, s.name
	`)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب الخيارات")
	}
	defer rows.Close()

	type subjectOpt struct {
		ID   string `json:"id"`
		Name string `json:"name"`
		Slug string `json:"slug"`
	}
	type gradeOpt struct {
		ID       string       `json:"id"`
		Name     string       `json:"name"`
		Level    int          `json:"level"`
		Subjects []subjectOpt `json:"subjects"`
	}

	gradeIndex := map[string]int{}
	grades := []gradeOpt{}
	for rows.Next() {
		var gID, gName, sID, sName, sSlug string
		var level int
		if err := rows.Scan(&gID, &gName, &level, &sID, &sName, &sSlug); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة الخيارات")
		}
		idx, ok := gradeIndex[gID]
		if !ok {
			grades = append(grades, gradeOpt{ID: gID, Name: gName, Level: level})
			idx = len(grades) - 1
			gradeIndex[gID] = idx
		}
		grades[idx].Subjects = append(grades[idx].Subjects, subjectOpt{ID: sID, Name: sName, Slug: sSlug})
	}
	return c.JSON(fiber.Map{"grades": grades})
}

type completeOnboardingRequest struct {
	GradeID    string   `json:"gradeId"`
	SubjectIDs []string `json:"subjectIds"`
}

// Complete يثبّت صف الطالب ومواده ويعلّم التهيئة مكتملة — داخل معاملة واحدة.
func (h *OnboardingHandler) Complete(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)

	var req completeOnboardingRequest
	if err := c.BodyParser(&req); err != nil || req.GradeID == "" || len(req.SubjectIDs) == 0 {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error", "gradeId و subjectIds مطلوبان")
	}

	tx, err := h.db.Begin(c.Context())
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر بدء العملية")
	}
	defer tx.Rollback(c.Context())

	// تحقق داخل الخادم أن الصف نشط فعلًا (لا تثق بالواجهة الأمامية)
	var gradeExists bool
	if err := tx.QueryRow(c.Context(), `
		SELECT EXISTS(SELECT 1 FROM grades WHERE id = $1 AND is_active = true)
	`, req.GradeID).Scan(&gradeExists); err != nil || !gradeExists {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "invalid_grade", "الصف المحدد غير متاح")
	}

	tag, err := tx.Exec(c.Context(), `
		UPDATE student_profiles SET grade_id = $2, onboarding_status = 'completed', updated_at = now()
		WHERE user_id = $1
	`, userID, req.GradeID)
	if err != nil || tag.RowsAffected() == 0 {
		return utils.ErrorResponse(c, fiber.StatusConflict, "no_student_profile", "هذا الحساب ليس حساب طالب")
	}

	if _, err := tx.Exec(c.Context(), `DELETE FROM student_subjects WHERE user_id = $1`, userID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر تحديث المواد")
	}
	for _, subjectID := range req.SubjectIDs {
		// يُقبل فقط ما ينتمي فعلًا للصف المختار وما زال نشطًا
		tag, err := tx.Exec(c.Context(), `
			INSERT INTO student_subjects (user_id, subject_id)
			SELECT $1, id FROM subjects WHERE id = $2 AND grade_id = $3 AND is_active = true
		`, userID, subjectID, req.GradeID)
		if err != nil || tag.RowsAffected() == 0 {
			return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "invalid_subject", "إحدى المواد المحددة غير متاحة لهذا الصف")
		}
	}

	if err := tx.Commit(c.Context()); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر إكمال التهيئة")
	}
	return c.JSON(fiber.Map{"completed": true})
}
