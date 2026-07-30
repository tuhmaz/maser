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

type AuthHandler struct {
	auth *service.AuthService
	db   *pgxpool.Pool // للتحليلات فقط (docs/analytics-events.md)
}

func NewAuthHandler(auth *service.AuthService, db *pgxpool.Pool) *AuthHandler {
	return &AuthHandler{auth: auth, db: db}
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

	analytics.Track(c.Context(), h.db, "register_completed", result.User.ID, nil, &analytics.UTM{
		Source: c.Query("utm_source"), Medium: c.Query("utm_medium"),
		Campaign: c.Query("utm_campaign"), Content: c.Query("utm_content"),
	})

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
	analytics.Track(c.Context(), h.db, "student_returned", result.User.ID, nil, nil)

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

type changePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

// ChangePassword يغيّر كلمة مرور المستخدم المسجَّل دخوله (طالبًا كان أو أدمن).
// تُلغى كل الجلسات القديمة وتُصدَر رموز جديدة للجهاز الحالي.
func (h *AuthHandler) ChangePassword(c *fiber.Ctx) error {
	userID, ok := middleware.UserIDFromContext(c)
	if !ok {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "unauthorized", "غير مصرح")
	}

	var req changePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "invalid_body", "تعذّرت قراءة الطلب")
	}
	if len(req.NewPassword) < 8 {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error", "كلمة المرور الجديدة 8 أحرف على الأقل")
	}
	if req.CurrentPassword == req.NewPassword {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error", "كلمة المرور الجديدة يجب أن تختلف عن الحالية")
	}

	result, err := h.auth.ChangePassword(c.Context(), userID, req.CurrentPassword, req.NewPassword,
		string(c.Request().Header.UserAgent()), c.IP())
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			return utils.ErrorResponse(c, fiber.StatusUnauthorized, "wrong_current_password", "كلمة المرور الحالية غير صحيحة")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر تغيير كلمة المرور")
	}

	return c.JSON(fiber.Map{
		"accessToken":  result.AccessToken,
		"refreshToken": result.RefreshToken,
		"user":         result.User,
	})
}

type forgotPasswordRequest struct {
	Email string `json:"email"`
}

// ForgotPassword يرسل رابط استعادة عبر البريد إن كان مسجَّلًا. الاستجابة ثابتة
// دائمًا (202) — لا تكشف أبدًا ما إذا كان البريد مسجلًا أم لا (docs/api-contract.md).
func (h *AuthHandler) ForgotPassword(c *fiber.Ctx) error {
	var req forgotPasswordRequest
	_ = c.BodyParser(&req)
	if req.Email != "" {
		h.auth.ForgotPassword(c.Context(), req.Email)
	}
	return c.SendStatus(fiber.StatusAccepted)
}

type resetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"newPassword"`
}

func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	var req resetPasswordRequest
	if err := c.BodyParser(&req); err != nil || req.Token == "" || len(req.NewPassword) < 8 {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error", "token وكلمة مرور 8 أحرف على الأقل مطلوبان")
	}
	if err := h.auth.ResetPassword(c.Context(), req.Token, req.NewPassword); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "invalid_token", "رابط الاستعادة غير صالح أو منتهي الصلاحية")
	}
	return c.JSON(fiber.Map{"reset": true})
}
