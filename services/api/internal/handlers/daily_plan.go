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

type DailyPlanHandler struct {
	plans        *service.DailyPlanService
	achievements *service.AchievementService
	db           *pgxpool.Pool
}

func NewDailyPlanHandler(plans *service.DailyPlanService, achievements *service.AchievementService, db *pgxpool.Pool) *DailyPlanHandler {
	return &DailyPlanHandler{plans: plans, achievements: achievements, db: db}
}

// GetToday يعيد خطة اليوم، أو { plan: null } إن لم تُولَّد بعد
// (الواجهة تعرض عندها زر "ابدأ يومك" الذي يستدعي /daily-plan/generate).
func (h *DailyPlanHandler) GetToday(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	plan, err := h.plans.GetToday(c.Context(), userID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب خطة اليوم")
	}
	if plan != nil {
		analytics.Track(c.Context(), h.db, "daily_plan_opened", userID, fiber.Map{"planId": plan.ID}, nil)
	}
	return c.JSON(fiber.Map{"plan": plan})
}

func (h *DailyPlanHandler) Generate(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	plan, err := h.plans.Generate(c.Context(), userID)
	if err != nil {
		if errors.Is(err, service.ErrNoSubject) {
			return utils.ErrorResponse(c, fiber.StatusConflict, "onboarding_required", "أكمل تهيئة الحساب أولًا")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر توليد خطة اليوم")
	}
	return c.Status(fiber.StatusCreated).JSON(plan)
}

func (h *DailyPlanHandler) StartTask(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	taskID := c.Params("taskId")

	result, err := h.plans.StartTask(c.Context(), userID, taskID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "المهمة غير موجودة")
		}
		if errors.Is(err, service.ErrNoQuestions) {
			return utils.ErrorResponse(c, fiber.StatusConflict, "no_questions", "لا توجد أسئلة متاحة لهذه المهمة")
		}
		if errors.Is(err, service.ErrTaskFinished) {
			return utils.ErrorResponse(c, fiber.StatusConflict, "task_finished", "هذه المهمة مكتملة بالفعل")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر بدء المهمة")
	}
	return c.JSON(result)
}

func (h *DailyPlanHandler) CompleteTask(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	taskID := c.Params("taskId")

	if err := h.plans.CompleteTask(c.Context(), userID, taskID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "المهمة غير موجودة")
		}
		if errors.Is(err, service.ErrTaskFinished) {
			return c.JSON(fiber.Map{"completed": true}) // idempotent: مكتملة بالفعل
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر إكمال المهمة")
	}
	_, _ = h.achievements.Award(c.Context(), userID, "first_task")
	analytics.Track(c.Context(), h.db, "daily_task_completed", userID, fiber.Map{"taskId": taskID}, nil)
	return c.JSON(fiber.Map{"completed": true})
}
