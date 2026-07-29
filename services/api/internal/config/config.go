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
