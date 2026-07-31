package handlers

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/audit"
	"github.com/alemedu/api/internal/config"
	"github.com/alemedu/api/internal/middleware"
	"github.com/alemedu/api/internal/repository"
	"github.com/alemedu/api/internal/utils"
)

// SettingsHandler يدير هوية الموقع (اسم/شعار/عنوان/تواصل اجتماعي/بريد تواصل)
// وإعدادات البريد الصادر — كلها قابلة للتعديل من لوحة الإدارة دون لمس الكود.
type SettingsHandler struct {
	db             *pgxpool.Pool // لسجل التدقيق فقط
	repo           *repository.SettingsRepository
	cfg            *config.Config
	storageDir     string
	publicAssetURL string
}

func NewSettingsHandler(db *pgxpool.Pool, repo *repository.SettingsRepository, cfg *config.Config, storageDir, publicAssetURL string) *SettingsHandler {
	return &SettingsHandler{db: db, repo: repo, cfg: cfg, storageDir: storageDir, publicAssetURL: publicAssetURL}
}

type publicSettingsDTO struct {
	SiteName        string  `json:"siteName"`
	Tagline         *string `json:"tagline,omitempty"`
	LogoURL         *string `json:"logoUrl,omitempty"`
	FaviconURL      *string `json:"faviconUrl,omitempty"`
	ContactEmail    *string `json:"contactEmail,omitempty"`
	SupportEmail    *string `json:"supportEmail,omitempty"`
	SocialFacebook  *string `json:"socialFacebook,omitempty"`
	SocialTwitter   *string `json:"socialTwitter,omitempty"`
	SocialInstagram *string `json:"socialInstagram,omitempty"`
	SocialYoutube   *string `json:"socialYoutube,omitempty"`
	SocialWhatsapp  *string `json:"socialWhatsapp,omitempty"`

	OAuthProviders oauthProvidersDTO `json:"oauthProviders"`
}

type oauthProvidersDTO struct {
	Google   bool `json:"google"`
	Facebook bool `json:"facebook"`
}

// Public يعيد هوية الموقع فقط — بلا أي إعدادات بريد حساسة. تستهلكه الواجهة
// الأمامية لكل الصفحات (الاسم/الشعار/روابط التواصل) دون مصادقة.
func (h *SettingsHandler) Public(c *fiber.Ctx) error {
	s, err := h.repo.Get(c.Context())
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب إعدادات الموقع")
	}
	return c.JSON(publicSettingsDTO{
		SiteName: s.SiteName, Tagline: s.Tagline, LogoURL: s.LogoURL, FaviconURL: s.FaviconURL,
		ContactEmail: s.ContactEmail, SupportEmail: s.SupportEmail,
		SocialFacebook: s.SocialFacebook, SocialTwitter: s.SocialTwitter, SocialInstagram: s.SocialInstagram,
		SocialYoutube: s.SocialYoutube, SocialWhatsapp: s.SocialWhatsapp,
		OAuthProviders: oauthProvidersDTO{Google: h.cfg.GoogleClientID != "", Facebook: h.cfg.FacebookClientID != ""},
	})
}

type adminSettingsDTO struct {
	publicSettingsDTO
	SMTPEnabled  bool    `json:"smtpEnabled"`
	SMTPHost     *string `json:"smtpHost,omitempty"`
	SMTPPort     *string `json:"smtpPort,omitempty"`
	SMTPUser     *string `json:"smtpUser,omitempty"`
	SMTPPassSet  bool    `json:"smtpPassSet"` // لا تُعاد كلمة المرور نفسها أبدًا، فقط إن كانت مضبوطة
	SMTPFromName *string `json:"smtpFromName,omitempty"`
	SMTPFrom     *string `json:"smtpFromEmail,omitempty"`
}

// Admin يعيد الإعدادات كاملة (بلا كلمة مرور SMTP الفعلية) — للوحة الإدارة فقط.
func (h *SettingsHandler) Admin(c *fiber.Ctx) error {
	s, err := h.repo.Get(c.Context())
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب إعدادات الموقع")
	}
	return c.JSON(adminSettingsDTO{
		publicSettingsDTO: publicSettingsDTO{
			SiteName: s.SiteName, Tagline: s.Tagline, LogoURL: s.LogoURL, FaviconURL: s.FaviconURL,
			ContactEmail: s.ContactEmail, SupportEmail: s.SupportEmail,
			SocialFacebook: s.SocialFacebook, SocialTwitter: s.SocialTwitter, SocialInstagram: s.SocialInstagram,
			SocialYoutube: s.SocialYoutube, SocialWhatsapp: s.SocialWhatsapp,
		},
		SMTPEnabled: s.SMTPEnabled, SMTPHost: s.SMTPHost, SMTPPort: s.SMTPPort, SMTPUser: s.SMTPUser,
		SMTPPassSet: s.SMTPPass != nil && *s.SMTPPass != "", SMTPFromName: s.SMTPFromName, SMTPFrom: s.SMTPFromEmail,
	})
}

type updateSettingsRequest struct {
	SiteName        *string `json:"siteName"`
	Tagline         *string `json:"tagline"`
	ContactEmail    *string `json:"contactEmail"`
	SupportEmail    *string `json:"supportEmail"`
	SocialFacebook  *string `json:"socialFacebook"`
	SocialTwitter   *string `json:"socialTwitter"`
	SocialInstagram *string `json:"socialInstagram"`
	SocialYoutube   *string `json:"socialYoutube"`
	SocialWhatsapp  *string `json:"socialWhatsapp"`

	SMTPEnabled  *bool   `json:"smtpEnabled"`
	SMTPHost     *string `json:"smtpHost"`
	SMTPPort     *string `json:"smtpPort"`
	SMTPUser     *string `json:"smtpUser"`
	SMTPPass     *string `json:"smtpPass"` // فارغ/غائب = لا تغيّر كلمة المرور المخزَّنة
	SMTPFromName *string `json:"smtpFromName"`
	SMTPFrom     *string `json:"smtpFromEmail"`
}

func (h *SettingsHandler) Update(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	var req updateSettingsRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "invalid_body", "تعذّرت قراءة الطلب")
	}
	if req.SiteName != nil && strings.TrimSpace(*req.SiteName) == "" {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error", "اسم الموقع لا يمكن أن يكون فارغًا")
	}

	var smtpPass *string
	if req.SMTPPass != nil && *req.SMTPPass != "" {
		smtpPass = req.SMTPPass // لا يُحدَّث إلا عند إرسال قيمة جديدة فعليًا
	}

	if err := h.repo.Update(c.Context(), repository.UpdateInput{
		SiteName: req.SiteName, Tagline: req.Tagline, ContactEmail: req.ContactEmail, SupportEmail: req.SupportEmail,
		SocialFacebook: req.SocialFacebook, SocialTwitter: req.SocialTwitter, SocialInstagram: req.SocialInstagram,
		SocialYoutube: req.SocialYoutube, SocialWhatsapp: req.SocialWhatsapp,
		SMTPEnabled: req.SMTPEnabled, SMTPHost: req.SMTPHost, SMTPPort: req.SMTPPort, SMTPUser: req.SMTPUser,
		SMTPPass: smtpPass, SMTPFromName: req.SMTPFromName, SMTPFromEmail: req.SMTPFrom,
	}); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر حفظ الإعدادات")
	}

	audit.Log(c.Context(), h.db, userID, "settings.update", "site_settings", "", nil)
	return c.JSON(fiber.Map{"updated": true})
}

// SVG مستبعد عمدًا: قد يحمل <script> قابلًا للتنفيذ عند فتح رابط الملف مباشرة
// في المتصفح (خارج سياق <img> الآمن الذي يستخدمه BrandMark) — .ico صيغة
// أيقونة ثنائية بحتة ولا تحمل هذا الخطر، فبقيت مسموحة.
// راجع docs/security-requirements.md.
var allowedImageExtForBranding = map[string]bool{".png": true, ".jpg": true, ".jpeg": true, ".webp": true, ".gif": true, ".ico": true}

// UploadLogo/UploadFavicon يرفعان صورة العلامة التجارية بنفس سياسة صور الأسئلة
// (docs/security-requirements.md: حد حجم، أنواع صور فقط، اسم ملف عشوائي).
func (h *SettingsHandler) uploadBrandingImage(c *fiber.Ctx, field string) error {
	userID, _ := middleware.UserIDFromContext(c)
	file, err := c.FormFile("file")
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "invalid_body", "يجب إرفاق ملف باسم الحقل file")
	}
	if file.Size > maxUploadBytes {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "file_too_large", "الحد الأقصى للحجم 5 ميغابايت")
	}
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !allowedImageExtForBranding[ext] {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "unsupported_type", "نوع ملف غير مسموح")
	}

	relPath := filepath.ToSlash(filepath.Join("branding", uuid.NewString()+ext))
	absPath := filepath.Join(h.storageDir, relPath)
	if err := os.MkdirAll(filepath.Dir(absPath), 0o755); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر تجهيز مجلد التخزين")
	}
	if err := c.SaveFile(file, absPath); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر حفظ الملف")
	}
	url := strings.TrimSuffix(h.publicAssetURL, "/") + "/" + relPath

	input := repository.UpdateInput{}
	if field == "logo" {
		input.LogoURL = &url
	} else {
		input.FaviconURL = &url
	}
	if err := h.repo.Update(c.Context(), input); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر حفظ رابط الصورة")
	}

	audit.Log(c.Context(), h.db, userID, "settings.upload_"+field, "site_settings", "", nil)
	return c.JSON(fiber.Map{"url": url})
}

func (h *SettingsHandler) UploadLogo(c *fiber.Ctx) error { return h.uploadBrandingImage(c, "logo") }
func (h *SettingsHandler) UploadFavicon(c *fiber.Ctx) error {
	return h.uploadBrandingImage(c, "favicon")
}
