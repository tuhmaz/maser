package config

import (
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

// Config يحمل كل الإعدادات المقروءة من البيئة.
// راجع docs/deployment-plan.md: لا تُحفظ الأسرار في الكود أبدًا.
type Config struct {
	AppEnv  string
	AppPort string

	DatabaseURL string
	RedisURL    string

	JWTAccessSecret     string
	JWTRefreshSecret    string
	JWTAccessTTLMinutes int
	JWTRefreshTTLDays   int

	CORSAllowedOrigins []string

	SMTPHost string
	SMTPPort string
	SMTPUser string
	SMTPPass string
	SMTPFrom string

	WebBaseURL string // لبناء روابط استعادة كلمة المرور (docs/api-contract.md)

	StorageDir     string // مجلد رفع الملفات المحلي (docs/database-design.md: Object Storage)
	PublicAssetURL string // القاعدة العامة لعرض الملفات المرفوعة
}

// Load يقرأ ملف .env إن وُجد (للتطوير المحلي فقط) ثم يقرأ متغيرات البيئة الفعلية.
func Load() *Config {
	_ = godotenv.Load() // تجاهل الخطأ: في staging/production تُمرَّر القيم عبر systemd/environment مباشرة

	return &Config{
		AppEnv:  getEnv("APP_ENV", "development"),
		AppPort: getEnv("APP_PORT", "8080"),

		DatabaseURL: getEnv("DATABASE_URL", ""),
		RedisURL:    getEnv("REDIS_URL", ""),

		JWTAccessSecret:     getEnv("JWT_ACCESS_SECRET", ""),
		JWTRefreshSecret:    getEnv("JWT_REFRESH_SECRET", ""),
		JWTAccessTTLMinutes: getEnvInt("JWT_ACCESS_TTL_MINUTES", 15),
		JWTRefreshTTLDays:   getEnvInt("JWT_REFRESH_TTL_DAYS", 30),

		CORSAllowedOrigins: strings.Split(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000"), ","),

		SMTPHost: getEnv("SMTP_HOST", ""),
		SMTPPort: getEnv("SMTP_PORT", "587"),
		SMTPUser: getEnv("SMTP_USER", ""),
		SMTPPass: getEnv("SMTP_PASS", ""),
		SMTPFrom: getEnv("SMTP_FROM", "no-reply@alemedu.com"),

		WebBaseURL: getEnv("WEB_BASE_URL", "http://localhost:3000"),

		StorageDir:     getEnv("STORAGE_DIR", "./storage"),
		PublicAssetURL: getEnv("PUBLIC_ASSET_URL", "http://localhost:8080/assets"),
	}
}

func (c *Config) IsProduction() bool {
	return c.AppEnv == "production"
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}
