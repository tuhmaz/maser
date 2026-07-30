package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/analytics"
	"github.com/alemedu/api/internal/middleware"
	"github.com/alemedu/api/internal/repository"
	"github.com/alemedu/api/internal/service"
	"github.com/alemedu/api/internal/utils"
)

type MistakesHandler struct {
	db           *pgxpool.Pool
	learning     *repository.LearningRepository
	achievements *service.AchievementService
}

func NewMistakesHandler(db *pgxpool.Pool, learning *repository.LearningRepository, achievements *service.AchievementService) *MistakesHandler {
	return &MistakesHandler{db: db, learning: learning, achievements: achievements}
}

type mistakeItem struct {
	ID           string  `json:"id"`
	QuestionID   string  `json:"questionId"`
	QuestionBody string  `json:"questionBody"`
	SkillName    string  `json:"skillName"`
	MistakeCount int     `json:"mistakeCount"`
	State        string  `json:"state"`
	NextReviewAt *string `json:"nextReviewAt,omitempty"`
}

func (h *MistakesHandler) list(c *fiber.Ctx, onlyDue bool) error {
	userID, _ := middleware.UserIDFromContext(c)

	dueFilter := ""
	if onlyDue {
		dueFilter = "AND rs.due_at <= now()"
	}

	// نص السؤال يُقرأ من الإصدار الحالي؛ الأخطاء لأسئلة مؤرشفة تبقى مقروءة عبر النسخة المحفوظة
	rows, err := h.db.Query(c.Context(), `
		SELECT sm.id, sm.question_id, qv.body, sk.name, sm.mistake_count, sm.mastery_state,
		       to_char(rs.due_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM student_mistakes sm
		JOIN skills sk ON sk.id = sm.skill_id
		JOIN questions q ON q.id = sm.question_id
		JOIN question_versions qv ON qv.question_id = q.id AND qv.version_number = q.current_version
		LEFT JOIN review_schedules rs
		  ON rs.mistake_id = sm.id AND rs.completed_at IS NULL
		WHERE sm.user_id = $1 AND sm.mastery_state <> 'mastered' `+dueFilter+`
		ORDER BY rs.due_at NULLS LAST, sm.last_seen_at DESC
	`, userID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب دفتر الأخطاء")
	}
	defer rows.Close()

	items := []mistakeItem{}
	for rows.Next() {
		var m mistakeItem
		if err := rows.Scan(&m.ID, &m.QuestionID, &m.QuestionBody, &m.SkillName, &m.MistakeCount, &m.State, &m.NextReviewAt); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة دفتر الأخطاء")
		}
		items = append(items, m)
	}
	return c.JSON(items)
}

// List دفتر الأخطاء كاملًا (غير المتقنة).
func (h *MistakesHandler) List(c *fiber.Ctx) error {
	return h.list(c, false)
}

// Due الأخطاء المستحقة للمراجعة الآن فقط —
// لا يُغرق الطالب بعشرات الأخطاء دفعة واحدة (docs/mastery-model.md).
func (h *MistakesHandler) Due(c *fiber.Ctx) error {
	return h.list(c, true)
}

type reviewRequest struct {
	Correct *bool `json:"correct"`
}

// Review يسجّل نتيجة مراجعة خطأ ويعيد جدولته.
func (h *MistakesHandler) Review(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	mistakeID := c.Params("mistakeId")

	var req reviewRequest
	if err := c.BodyParser(&req); err != nil || req.Correct == nil {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error", `الحقل "correct" (true/false) مطلوب`)
	}

	newState, err := h.learning.ReviewOutcome(c.Context(), userID, mistakeID, *req.Correct)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "الخطأ غير موجود في دفترك")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر تسجيل المراجعة")
	}

	if streak, err := h.learning.TouchStreak(c.Context(), userID); err == nil {
		h.achievements.CheckStreak(c.Context(), userID, streak)
	}
	_, _ = h.achievements.Award(c.Context(), userID, "first_mistake_reviewed")
	analytics.Track(c.Context(), h.db, "mistake_reviewed", userID, fiber.Map{"mistakeId": mistakeID, "correct": *req.Correct, "newState": newState}, nil)
	return c.JSON(fiber.Map{"newState": newState})
}
