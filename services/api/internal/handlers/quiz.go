package handlers

import (
	"encoding/json"
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/analytics"
	"github.com/alemedu/api/internal/middleware"
	"github.com/alemedu/api/internal/repository"
	"github.com/alemedu/api/internal/service"
	"github.com/alemedu/api/internal/utils"
)

type QuizHandler struct {
	quiz *service.QuizService
	db   *pgxpool.Pool // للتحليلات فقط
}

func NewQuizHandler(quiz *service.QuizService, db *pgxpool.Pool) *QuizHandler {
	return &QuizHandler{quiz: quiz, db: db}
}

func (h *QuizHandler) StartDiagnostic(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)

	view, err := h.quiz.StartDiagnostic(c.Context(), userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return utils.ErrorResponse(c, fiber.StatusConflict, "onboarding_required", "أكمل تهيئة الحساب (اختيار الصف والمادة) قبل بدء الاختبار التشخيصي")
		}
		if errors.Is(err, service.ErrNoQuestions) {
			return utils.ErrorResponse(c, fiber.StatusConflict, "no_questions", "لا توجد أسئلة منشورة لهذه المادة بعد")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر بدء الاختبار التشخيصي")
	}
	analytics.Track(c.Context(), h.db, "diagnostic_started", userID, fiber.Map{"attemptId": view.Attempt.ID}, nil)
	return c.Status(fiber.StatusCreated).JSON(view)
}

func (h *QuizHandler) StartQuiz(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	quizID := c.Params("quizId")

	view, err := h.quiz.StartQuiz(c.Context(), userID, quizID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "الاختبار غير موجود")
		}
		if errors.Is(err, service.ErrNoQuestions) {
			return utils.ErrorResponse(c, fiber.StatusConflict, "no_questions", "لا يحتوي هذا الاختبار على أسئلة منشورة")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر بدء الاختبار")
	}
	analytics.Track(c.Context(), h.db, "quiz_started", userID, fiber.Map{"quizId": quizID, "attemptId": view.Attempt.ID}, nil)
	return c.Status(fiber.StatusCreated).JSON(view)
}

func (h *QuizHandler) GetAttempt(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	attemptID := c.Params("attemptId")

	view, err := h.quiz.GetAttempt(c.Context(), userID, attemptID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			// نفس الاستجابة سواء كانت المحاولة غير موجودة أو لطالب آخر — لا كشف للوجود
			return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "المحاولة غير موجودة")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب المحاولة")
	}
	return c.JSON(view)
}

type saveAnswerRequest struct {
	QuestionID  string          `json:"questionId"`
	Answer      json.RawMessage `json:"answer"`
	TimeSpentMs *int            `json:"timeSpentMs,omitempty"`
}

func (h *QuizHandler) SaveAnswer(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	attemptID := c.Params("attemptId")

	var req saveAnswerRequest
	if err := c.BodyParser(&req); err != nil || req.QuestionID == "" || len(req.Answer) == 0 {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "invalid_body", "questionId و answer مطلوبان")
	}

	err := h.quiz.SaveAnswer(c.Context(), userID, attemptID, req.QuestionID, req.Answer, req.TimeSpentMs)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrNotFound):
			return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "المحاولة أو السؤال غير موجود")
		case errors.Is(err, service.ErrAttemptNotInProgress):
			return utils.ErrorResponse(c, fiber.StatusConflict, "attempt_finished", "المحاولة منتهية — لا يمكن إرسال إجابات بعد التسليم")
		case errors.Is(err, service.ErrQuestionNotInAttempt):
			return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "question_not_in_attempt", "السؤال لا ينتمي لهذه المحاولة")
		case errors.Is(err, service.ErrInvalidAnswer):
			return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "invalid_answer", "شكل الإجابة غير صالح لهذا النوع من الأسئلة")
		case errors.Is(err, service.ErrUnsupportedQuestionType):
			return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "unsupported_type", "نوع السؤال غير مدعوم بعد")
		default:
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر حفظ الإجابة")
		}
	}
	// لا تُعاد صحة الإجابة هنا — تظهر فقط في تقرير ما بعد التسليم
	analytics.Track(c.Context(), h.db, "question_answered", userID, fiber.Map{"attemptId": attemptID, "questionId": req.QuestionID}, nil)
	return c.JSON(fiber.Map{"saved": true})
}

func (h *QuizHandler) Submit(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	attemptID := c.Params("attemptId")

	result, err := h.quiz.Submit(c.Context(), userID, attemptID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "المحاولة غير موجودة")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر إنهاء المحاولة")
	}
	analytics.Track(c.Context(), h.db, "quiz_completed", userID, fiber.Map{
		"attemptId": attemptID, "score": result.Score, "correctCount": result.CorrectCount, "totalCount": result.TotalCount,
	}, nil)
	return c.JSON(result)
}

func (h *QuizHandler) GetResult(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	attemptID := c.Params("attemptId")

	result, err := h.quiz.GetResult(c.Context(), userID, attemptID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "لا توجد نتيجة لهذه المحاولة (لم تُسلَّم بعد؟)")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب النتيجة")
	}
	return c.JSON(result)
}
