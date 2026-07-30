package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"

	"github.com/alemedu/api/internal/middleware"
	"github.com/alemedu/api/internal/repository"
	"github.com/alemedu/api/internal/service"
	"github.com/alemedu/api/internal/utils"
)

type DailyPlanHandler struct {
	plans *service.DailyPlanService
}

func NewDailyPlanHandler(plans *service.DailyPlanService) *DailyPlanHandler {
	return &DailyPlanHandler{plans: plans}
}

// GetToday يعيد خطة اليوم، أو { plan: null } إن لم تُولَّد بعد
// (الواجهة تعرض عندها زر "ابدأ يومك" الذي يستدعي /daily-plan/generate).
func (h *DailyPlanHandler) GetToday(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	plan, err := h.plans.GetToday(c.Context(), userID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب خطة اليوم")
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
	return c.JSON(fiber.Map{"completed": true})
}
