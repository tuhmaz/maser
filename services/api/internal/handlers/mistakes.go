package handlers

import (
	"encoding/json"
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/analytics"
	"github.com/alemedu/api/internal/middleware"
	"github.com/alemedu/api/internal/models"
	"github.com/alemedu/api/internal/repository"
	"github.com/alemedu/api/internal/service"
	"github.com/alemedu/api/internal/utils"
)

type MistakesHandler struct {
	db           *pgxpool.Pool
	questions    *repository.QuestionRepository
	learning     *repository.LearningRepository
	achievements *service.AchievementService
}

func NewMistakesHandler(db *pgxpool.Pool, questions *repository.QuestionRepository, learning *repository.LearningRepository, achievements *service.AchievementService) *MistakesHandler {
	return &MistakesHandler{db: db, questions: questions, learning: learning, achievements: achievements}
}

type mistakeItem struct {
	ID           string                    `json:"id"`
	QuestionID   string                    `json:"questionId"`
	QuestionBody string                    `json:"questionBody"`
	SkillName    string                    `json:"skillName"`
	MistakeCount int                       `json:"mistakeCount"`
	State        string                    `json:"state"`
	NextReviewAt *string                   `json:"nextReviewAt,omitempty"`
	Question     *models.SanitizedQuestion `json:"question,omitempty"`
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
	questionIDs := make([]string, 0)
	for rows.Next() {
		var m mistakeItem
		if err := rows.Scan(&m.ID, &m.QuestionID, &m.QuestionBody, &m.SkillName, &m.MistakeCount, &m.State, &m.NextReviewAt); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة دفتر الأخطاء")
		}
		items = append(items, m)
		questionIDs = append(questionIDs, m.QuestionID)
	}
	if rows.Err() != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة دفتر الأخطاء")
	}

	// نُرفق السؤال كاملًا (خيارات بلا كشف الصحيح) حتى تستطيع الواجهة عرض إجابة
	// حقيقية قابلة للتصحيح، بدل تقييم الطالب لنفسه بصدق مفترَض.
	byID, err := h.questions.ByIDs(c.Context(), questionIDs)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب أسئلة المراجعة")
	}
	for i := range items {
		if q, ok := byID[items[i].QuestionID]; ok {
			sanitized := q.Sanitized(false)
			items[i].Question = &sanitized
		}
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
	Answer json.RawMessage `json:"answer"`
}

// Review يصحّح إجابة مراجعة الخطأ داخل الخادم حصرًا — كان سابقًا يقبل حقل
// "correct" جاهزًا من الطالب نفسه (تقييم ذاتي غير موثوق: أي عميل يستطيع
// إرسال true دائمًا ليتلاعب بحالة الإتقان). الآن يُرسَل شكل الإجابة الفعلي
// (نفس صيغة AnswerPayload في محرك الاختبارات) ويُصحَّح بنفس آلية Grade.
func (h *MistakesHandler) Review(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	mistakeID := c.Params("mistakeId")

	var req reviewRequest
	if err := c.BodyParser(&req); err != nil || len(req.Answer) == 0 {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error", `الحقل "answer" مطلوب`)
	}

	questionID, err := h.learning.MistakeQuestionID(c.Context(), userID, mistakeID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "الخطأ غير موجود في دفترك")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب بيانات المراجعة")
	}

	byID, err := h.questions.ByIDs(c.Context(), []string{questionID})
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب السؤال")
	}
	q, ok := byID[questionID]
	if !ok {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "السؤال لم يعد متاحًا للمراجعة")
	}

	correct, err := service.Grade(&q, req.Answer)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "invalid_answer", "شكل الإجابة غير صالح لهذا النوع من الأسئلة")
	}

	newState, err := h.learning.ReviewOutcome(c.Context(), userID, mistakeID, correct)
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
	analytics.Track(c.Context(), h.db, "mistake_reviewed", userID, fiber.Map{"mistakeId": mistakeID, "correct": correct, "newState": newState}, nil)
	return c.JSON(fiber.Map{"newState": newState, "correct": correct})
}
