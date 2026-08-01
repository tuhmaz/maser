package config

import (
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

const minProductionSecretLen = 32

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

	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPass     string
	SMTPFrom     string
	SMTPFromName string

	WebBaseURL string // لبناء روابط استعادة كلمة المرور (docs/api-contract.md)

	// CookieDomain نطاق كوكي رمز التحديث — فارغ افتراضيًا (host-only، يكفي في
	// التطوير المحلي). في الإنتاج يُضبط لنطاق أب مشترك (مثل ".alemedu.com")
	// إن كانت الواجهة والـAPI على نطاقات فرعية مختلفة.
	CookieDomain string

	StorageDir     string // مجلد رفع الملفات المحلي (docs/database-design.md: Object Storage)
	PublicAssetURL string // القاعدة العامة لعرض الملفات المرفوعة

	// تسجيل الدخول عبر Google/Facebook — فارغة افتراضيًا (جاهزية بلا تفعيل).
	// راجع services/api/internal/handlers/oauth.go لكيفية التحقق من التفعيل.
	GoogleClientID       string
	GoogleClientSecret   string
	GoogleRedirectURL    string
	FacebookClientID     string
	FacebookClientSecret string
	FacebookRedirectURL  string

	// توليد مسودات أسئلة عبر Together AI — فارغ افتراضيًا (الميزة معطَّلة حتى
	// يُضبط المفتاح فعليًا، بنفس نمط Google/Facebook أعلاه).
	TogetherAPIKey        string
	TogetherDefaultModel  string
	TogetherAllowedModels []string
}

// Load يقرأ ملف .env إن وُجد (للتطوير المحلي فقط) ثم يقرأ متغيرات البيئة الفعلية.
func Load() *Config {
	_ = godotenv.Load() // تجاهل الخطأ: في staging/production تُمرَّر القيم عبر systemd/environment مباشرة

	cfg := &Config{
		AppEnv:  getEnv("APP_ENV", "development"),
		AppPort: getEnv("APP_PORT", "8080"),

		DatabaseURL: getEnv("DATABASE_URL", ""),
		RedisURL:    getEnv("REDIS_URL", ""),

		JWTAccessSecret:     getEnv("JWT_ACCESS_SECRET", ""),
		JWTRefreshSecret:    getEnv("JWT_REFRESH_SECRET", ""),
		JWTAccessTTLMinutes: getEnvInt("JWT_ACCESS_TTL_MINUTES", 15),
		JWTRefreshTTLDays:   getEnvInt("JWT_REFRESH_TTL_DAYS", 30),

		CORSAllowedOrigins: strings.Split(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000"), ","),

		SMTPHost:     getEnv("SMTP_HOST", ""),
		SMTPPort:     getEnv("SMTP_PORT", "587"),
		SMTPUser:     getEnv("SMTP_USER", ""),
		SMTPPass:     getEnv("SMTP_PASS", ""),
		SMTPFrom:     getEnv("SMTP_FROM", "no-reply@alemedu.com"),
		SMTPFromName: getEnv("SMTP_FROM_NAME", "Alemedu"),

		WebBaseURL:   getEnv("WEB_BASE_URL", "http://localhost:3000"),
		CookieDomain: getEnv("COOKIE_DOMAIN", ""),

		StorageDir:     getEnv("STORAGE_DIR", "./storage"),
		PublicAssetURL: getEnv("PUBLIC_ASSET_URL", "http://localhost:8080/assets"),

		GoogleClientID:       getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret:   getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:    getEnv("GOOGLE_REDIRECT_URL", getEnv("API_BASE_URL", "http://localhost:8080")+"/auth/oauth/google/callback"),
		FacebookClientID:     getEnv("FACEBOOK_CLIENT_ID", ""),
		FacebookClientSecret: getEnv("FACEBOOK_CLIENT_SECRET", ""),
		FacebookRedirectURL:  getEnv("FACEBOOK_REDIRECT_URL", getEnv("API_BASE_URL", "http://localhost:8080")+"/auth/oauth/facebook/callback"),

		TogetherAPIKey:       getEnv("TOGETHER_API_KEY", ""),
		TogetherDefaultModel: getEnv("TOGETHER_DEFAULT_MODEL", "meta-llama/Llama-3.3-70B-Instruct-Turbo"),
		TogetherAllowedModels: strings.Split(getEnv("TOGETHER_ALLOWED_MODELS",
			"meta-llama/Llama-3.3-70B-Instruct-Turbo,Qwen/Qwen2.5-72B-Instruct-Turbo,deepseek-ai/DeepSeek-V3"), ","),
	}

	cfg.validateSecrets()
	return cfg
}

// validateSecrets يمنع إقلاع الخادم بسرّ JWT فارغ أو ضعيف — توقيع HS256 بسرّ
// فارغ/متوقَّع يسمح لأي مهاجم بتزوير رموز وصول صالحة (بما فيها دور super_admin).
// راجع docs/security-requirements.md.
func (c *Config) validateSecrets() {
	if c.JWTAccessSecret == "" {
		log.Fatal("JWT_ACCESS_SECRET غير مضبوط — لا يمكن تشغيل الخادم بسرّ توقيع فارغ (خطر تزوير الرموز)")
	}
	if c.IsProduction() && len(c.JWTAccessSecret) < minProductionSecretLen {
		log.Fatalf("JWT_ACCESS_SECRET قصير جدًا للإنتاج — يجب %d حرفًا على الأقل", minProductionSecretLen)
	}
	if len(c.JWTAccessSecret) < minProductionSecretLen {
		log.Printf("تحذير: JWT_ACCESS_SECRET أقصر من %d حرفًا — مقبول للتطوير المحلي فقط", minProductionSecretLen)
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
