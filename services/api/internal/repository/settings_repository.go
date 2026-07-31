package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// SiteSettings الصف الوحيد في site_settings — هوية الموقع وإعدادات البريد الصادر.
type SiteSettings struct {
	SiteName        string
	Tagline         *string
	LogoURL         *string
	FaviconURL      *string
	ContactEmail    *string
	SupportEmail    *string
	SocialFacebook  *string
	SocialTwitter   *string
	SocialInstagram *string
	SocialYoutube   *string
	SocialWhatsapp  *string

	SMTPEnabled   bool
	SMTPHost      *string
	SMTPPort      *string
	SMTPUser      *string
	SMTPPass      *string
	SMTPFromName  *string
	SMTPFromEmail *string
}

type SettingsRepository struct {
	db *pgxpool.Pool
}

func NewSettingsRepository(db *pgxpool.Pool) *SettingsRepository {
	return &SettingsRepository{db: db}
}

func (r *SettingsRepository) Get(ctx context.Context) (*SiteSettings, error) {
	var s SiteSettings
	err := r.db.QueryRow(ctx, `
		SELECT site_name, tagline, logo_url, favicon_url, contact_email, support_email,
		       social_facebook, social_twitter, social_instagram, social_youtube, social_whatsapp,
		       smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email
		FROM site_settings WHERE id = 1
	`).Scan(&s.SiteName, &s.Tagline, &s.LogoURL, &s.FaviconURL, &s.ContactEmail, &s.SupportEmail,
		&s.SocialFacebook, &s.SocialTwitter, &s.SocialInstagram, &s.SocialYoutube, &s.SocialWhatsapp,
		&s.SMTPEnabled, &s.SMTPHost, &s.SMTPPort, &s.SMTPUser, &s.SMTPPass, &s.SMTPFromName, &s.SMTPFromEmail)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// UpdateInput حقول قابلة للتحديث جزئيًا (nil = لا تغيير). SMTPPass استثناء: قيمة
// فارغة صراحةً "" تُترجَم إلى "لا تغيّر كلمة المرور المخزّنة" — لا تُعاد أبدًا للعميل
// (docs/security-requirements.md)، فلا يمكن للواجهة إرسالها إلا عند تعيين كلمة جديدة فعليًا.
type UpdateInput struct {
	SiteName        *string
	Tagline         *string
	LogoURL         *string
	FaviconURL      *string
	ContactEmail    *string
	SupportEmail    *string
	SocialFacebook  *string
	SocialTwitter   *string
	SocialInstagram *string
	SocialYoutube   *string
	SocialWhatsapp  *string

	SMTPEnabled   *bool
	SMTPHost      *string
	SMTPPort      *string
	SMTPUser      *string
	SMTPPass      *string // nil = لا تغيير
	SMTPFromName  *string
	SMTPFromEmail *string
}

func (r *SettingsRepository) Update(ctx context.Context, in UpdateInput) error {
	_, err := r.db.Exec(ctx, `
		UPDATE site_settings SET
			site_name        = COALESCE($1, site_name),
			tagline          = COALESCE($2, tagline),
			logo_url         = COALESCE($3, logo_url),
			favicon_url      = COALESCE($4, favicon_url),
			contact_email    = COALESCE($5, contact_email),
			support_email    = COALESCE($6, support_email),
			social_facebook  = COALESCE($7, social_facebook),
			social_twitter   = COALESCE($8, social_twitter),
			social_instagram = COALESCE($9, social_instagram),
			social_youtube   = COALESCE($10, social_youtube),
			social_whatsapp  = COALESCE($11, social_whatsapp),
			smtp_enabled     = COALESCE($12, smtp_enabled),
			smtp_host        = COALESCE($13, smtp_host),
			smtp_port        = COALESCE($14, smtp_port),
			smtp_user        = COALESCE($15, smtp_user),
			smtp_pass        = COALESCE($16, smtp_pass),
			smtp_from_name   = COALESCE($17, smtp_from_name),
			smtp_from_email  = COALESCE($18, smtp_from_email),
			updated_at       = now()
		WHERE id = 1
	`, in.SiteName, in.Tagline, in.LogoURL, in.FaviconURL, in.ContactEmail, in.SupportEmail,
		in.SocialFacebook, in.SocialTwitter, in.SocialInstagram, in.SocialYoutube, in.SocialWhatsapp,
		in.SMTPEnabled, in.SMTPHost, in.SMTPPort, in.SMTPUser, in.SMTPPass, in.SMTPFromName, in.SMTPFromEmail)
	return err
}
