package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/alemedu/api/internal/config"
)

const refreshCookieName = "refresh_token"

// setRefreshCookie يخزّن رمز التحديث في كوكي HttpOnly لا تصل إليه جافاسكربت
// إطلاقًا — يقطع الطريق على سرقته عبر XSS مهما طالت مدة صلاحيته (كانت تُعاد
// سابقًا في جسم JSON وتُخزَّن في localStorage، وهو ما يعرّضها لأي ثغرة XSS
// في أي مكان بالتطبيق). راجع docs/security-requirements.md.
func setRefreshCookie(c *fiber.Ctx, cfg *config.Config, token string) {
	c.Cookie(&fiber.Cookie{
		Name:     refreshCookieName,
		Value:    token,
		Path:     "/",
		Domain:   cfg.CookieDomain,
		MaxAge:   cfg.JWTRefreshTTLDays * 24 * 60 * 60,
		HTTPOnly: true,
		Secure:   cfg.IsProduction(),
		SameSite: "Lax",
	})
}

// clearRefreshCookie يمحو كوكي الجلسة عند تسجيل الخروج أو فشل تجديد نهائي.
func clearRefreshCookie(c *fiber.Ctx, cfg *config.Config) {
	c.Cookie(&fiber.Cookie{
		Name:     refreshCookieName,
		Value:    "",
		Path:     "/",
		Domain:   cfg.CookieDomain,
		Expires:  time.Unix(0, 0),
		HTTPOnly: true,
		Secure:   cfg.IsProduction(),
		SameSite: "Lax",
	})
}
