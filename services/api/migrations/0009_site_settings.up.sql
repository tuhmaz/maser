-- 0009_site_settings.up.sql
-- إعدادات الموقع القابلة للتعديل من لوحة الإدارة (اسم/شعار/عنوان/تواصل اجتماعي/بريد)
-- + حسابات تسجيل الدخول الخارجي (Google/Facebook) — تجهيز البنية دون تفعيل فعلي
-- حتى تُضاف بيانات اعتماد تطبيق حقيقية.

-- صف واحد ثابت (singleton) عبر قيد على المعرف — أبسط من جدول key/value هنا
-- لأن الحقول محدودة ومعروفة مسبقًا.
CREATE TABLE site_settings (
    id               SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),

    site_name        TEXT NOT NULL DEFAULT 'Alemedu',
    tagline          TEXT,
    logo_url         TEXT,
    favicon_url      TEXT,

    contact_email    TEXT,
    support_email    TEXT,

    social_facebook  TEXT,
    social_twitter   TEXT,
    social_instagram TEXT,
    social_youtube   TEXT,
    social_whatsapp  TEXT,

    -- إعدادات البريد الصادر — قابلة للضبط من لوحة الإدارة مباشرة (بديل عن SMTP_* في .env).
    -- إن كان smtp_enabled = false أو smtp_host فارغًا يعمل الخادم في وضع "تسجيل بدل إرسال".
    smtp_enabled     BOOLEAN NOT NULL DEFAULT false,
    smtp_host        TEXT,
    smtp_port        TEXT,
    smtp_user        TEXT,
    smtp_pass        TEXT,
    smtp_from_name   TEXT,
    smtp_from_email  TEXT,

    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ربط حسابات تسجيل الدخول الخارجي بحساب مستخدم موجود.
CREATE TABLE oauth_accounts (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider         TEXT NOT NULL CHECK (provider IN ('google', 'facebook')),
    provider_user_id TEXT NOT NULL,
    email            CITEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_user_id)
);
CREATE INDEX idx_oauth_accounts_user ON oauth_accounts(user_id);
