package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"

	"github.com/alemedu/api/internal/middleware"
	"github.com/alemedu/api/internal/repository"
	"github.com/alemedu/api/internal/service"
	"github.com/alemedu/api/internal/utils"
)

type AuthHandler struct {
	auth *service.AuthService
}

func NewAuthHandler(auth *service.AuthService) *AuthHandler {
	return &AuthHandler{auth: auth}
}

type registerRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"displayName"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req registerRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "invalid_body", "تعذّرت قراءة الطلب")
	}

	if len(req.Password) < 8 || req.Email == "" || req.DisplayName == "" {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error",
			"البريد وكلمة المرور (8 أحرف على الأقل) والاسم مطلوبة")
	}

	result, err := h.auth.Register(c.Context(), req.Email, req.Password, req.DisplayName, string(c.Request().Header.UserAgent()), c.IP())
	if err != nil {
		if errors.Is(err, repository.ErrDuplicateEmail) {
			return utils.ErrorResponse(c, fiber.StatusConflict, "email_taken", "البريد الإلكتروني مستخدم بالفعل")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "حدث خطأ غير متوقع")
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"accessToken":  result.AccessToken,
		"refreshToken": result.RefreshToken,
		"user":         result.User,
	})
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req loginRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "invalid_body", "تعذّرت قراءة الطلب")
	}

	result, err := h.auth.Login(c.Context(), req.Email, req.Password, string(c.Request().Header.UserAgent()), c.IP())
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "invalid_credentials", "البريد الإلكتروني أو كلمة المرور غير صحيحة")
	}

	return c.JSON(fiber.Map{
		"accessToken":  result.AccessToken,
		"refreshToken": result.RefreshToken,
		"user":         result.User,
	})
}

type refreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}

func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	var req refreshRequest
	if err := c.BodyParser(&req); err != nil || req.RefreshToken == "" {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "invalid_body", "رمز التحديث مطلوب")
	}

	result, err := h.auth.Refresh(c.Context(), req.RefreshToken, string(c.Request().Header.UserAgent()), c.IP())
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "invalid_refresh_token", "رمز التحديث غير صالح أو منتهٍ")
	}

	return c.JSON(fiber.Map{
		"accessToken":  result.AccessToken,
		"refreshToken": result.RefreshToken,
		"user":         result.User,
	})
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	var req refreshRequest
	_ = c.BodyParser(&req)
	if req.RefreshToken != "" {
		_ = h.auth.Logout(c.Context(), req.RefreshToken)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *AuthHandler) Me(c *fiber.Ctx) error {
	userID, ok := middleware.UserIDFromContext(c)
	if !ok {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "unauthorized", "غير مصرح")
	}

	user, err := h.auth.Me(c.Context(), userID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "المستخدم غير موجود")
	}

	return c.JSON(user)
}

// ForgotPassword و ResetPassword: منطق إرسال البريد يُضاف مع خدمة البريد الفعلية.
// الاستجابة هنا لا تكشف أبدًا ما إذا كان البريد مسجلًا أم لا (لحماية الخصوصية).
func (h *AuthHandler) ForgotPassword(c *fiber.Ctx) error {
	return c.SendStatus(fiber.StatusAccepted)
}

func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	return utils.ErrorResponse(c, fiber.StatusNotImplemented, "not_implemented", "لم تُفعَّل هذه الميزة بعد")
}
