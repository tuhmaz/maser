package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/analytics"
	"github.com/alemedu/api/internal/config"
	"github.com/alemedu/api/internal/middleware"
	"github.com/alemedu/api/internal/repository"
	"github.com/alemedu/api/internal/service"
	"github.com/alemedu/api/internal/utils"
)

type AuthHandler struct {
	auth *service.AuthService
	db   *pgxpool.Pool // للتحليلات فقط (docs/analytics-events.md)
	cfg  *config.Config
}

func NewAuthHandler(auth *service.AuthService, db *pgxpool.Pool, cfg *config.Config) *AuthHandler {
	return &AuthHandler{auth: auth, db: db, cfg: cfg}
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

	if len(req.Password) < 8 || !utils.IsValidEmail(req.Email) || req.DisplayName == "" {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error",
			"بريد إلكتروني صالح وكلمة مرور (8 أحرف على الأقل) واسم مطلوبون")
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

	setRefreshCookie(c, h.cfg, result.RefreshToken)
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"accessToken": result.AccessToken,
		"user":        result.User,
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

	setRefreshCookie(c, h.cfg, result.RefreshToken)
	return c.JSON(fiber.Map{
		"accessToken": result.AccessToken,
		"user":        result.User,
	})
}

// Refresh يقرأ رمز التحديث من كوكي HttpOnly حصرًا — لا يُقبل أبدًا من جسم
// الطلب (كان JS قادرًا على قراءته من localStorage سابقًا؛ الآن لا يراه إطلاقًا).
func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	refreshToken := c.Cookies(refreshCookieName)
	if refreshToken == "" {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "invalid_refresh_token", "لا توجد جلسة نشطة")
	}

	result, err := h.auth.Refresh(c.Context(), refreshToken, string(c.Request().Header.UserAgent()), c.IP())
	if err != nil {
		clearRefreshCookie(c, h.cfg)
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "invalid_refresh_token", "رمز التحديث غير صالح أو منتهٍ")
	}

	setRefreshCookie(c, h.cfg, result.RefreshToken) // دوران: كوكي جديدة بالرمز الجديد
	return c.JSON(fiber.Map{
		"accessToken": result.AccessToken,
		"user":        result.User,
	})
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	if refreshToken := c.Cookies(refreshCookieName); refreshToken != "" {
		_ = h.auth.Logout(c.Context(), refreshToken)
	}
	clearRefreshCookie(c, h.cfg)
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

	setRefreshCookie(c, h.cfg, result.RefreshToken)
	return c.JSON(fiber.Map{
		"accessToken": result.AccessToken,
		"user":        result.User,
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
	if utils.IsValidEmail(req.Email) {
		h.auth.ForgotPassword(c.Context(), req.Email)
	}
	// نفس الاستجابة دائمًا (حتى لصيغة غير صالحة) — لا كشف عن وجود الحساب من عدمه
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

type verifyEmailRequest struct {
	Token string `json:"token"`
}

// VerifyEmail يفعّل بريد المستخدم عبر الرمز المُرسَل في رسالة التسجيل.
func (h *AuthHandler) VerifyEmail(c *fiber.Ctx) error {
	var req verifyEmailRequest
	if err := c.BodyParser(&req); err != nil || req.Token == "" {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error", "token مطلوب")
	}
	if err := h.auth.VerifyEmail(c.Context(), req.Token); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "invalid_token", "رابط التفعيل غير صالح أو منتهي الصلاحية")
	}
	return c.JSON(fiber.Map{"verified": true})
}

// ResendVerification يعيد إرسال رابط تفعيل البريد للمستخدم الحالي.
func (h *AuthHandler) ResendVerification(c *fiber.Ctx) error {
	userID, ok := middleware.UserIDFromContext(c)
	if !ok {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "unauthorized", "غير مصرح")
	}
	if err := h.auth.ResendVerification(c.Context(), userID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر إعادة إرسال رسالة التفعيل")
	}
	return c.SendStatus(fiber.StatusAccepted)
}
