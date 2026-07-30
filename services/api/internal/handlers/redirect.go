package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/analytics"
	"github.com/alemedu/api/internal/config"
	"github.com/alemedu/api/internal/middleware"
)

// RedirectHandler ينفّذ "الربط المباشر" من موقع الإيمان (docs/analytics-events.md):
// alemancenter.com/article/... → api.alemedu.com/r?to=/grade/7/math&utm_source=alemancenter...
// يسجّل page_view بمعلمات UTM قبل التحويل إلى الوجهة الفعلية على alemedu.com.
type RedirectHandler struct {
	db  *pgxpool.Pool
	cfg *config.Config
}

func NewRedirectHandler(db *pgxpool.Pool, cfg *config.Config) *RedirectHandler {
	return &RedirectHandler{db: db, cfg: cfg}
}

// FromAlemancenter يحوّل زائرًا قادمًا من موقع الإيمان إلى صفحة محددة على
// alemedu.com، مسجّلاً مصدر الزيارة أولًا. "to" يجب أن يكون مسارًا نسبيًا
// (يبدأ بـ /) لمنع استخدام هذه النقطة كأداة تحويل مفتوحة (open redirect).
func (h *RedirectHandler) FromAlemancenter(c *fiber.Ctx) error {
	dest := c.Query("to", "/")
	if !strings.HasPrefix(dest, "/") || strings.HasPrefix(dest, "//") {
		dest = "/"
	}

	userID, _ := middleware.UserIDFromContext(c) // غالبًا فارغة: زائر غير مسجَّل دخول بعد
	analytics.Track(c.Context(), h.db, "page_view", userID, fiber.Map{"destination": dest, "referrer": "alemancenter"}, &analytics.UTM{
		Source: c.Query("utm_source", "alemancenter"), Medium: c.Query("utm_medium"),
		Campaign: c.Query("utm_campaign"), Content: c.Query("utm_content"),
	})

	target := strings.TrimSuffix(h.cfg.WebBaseURL, "/") + dest
	return c.Redirect(target, fiber.StatusFound)
}
