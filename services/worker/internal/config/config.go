package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv      string
	DatabaseURL string
	JobInterval time.Duration

	// StorageDir يجب أن يطابق STORAGE_DIR في services/api (نفس القرص) — الـworker
	// يقرأ ملفات مرفوعة (كتب PDF) مباشرة من هنا، لا عبر storage.Storage
	// (لا وحدة مشتركة لهذا التجريد بين api وworker — راجع docs/ai-curriculum-roadmap.md، E10).
	StorageDir string

	// GeminiAPIKey فارغ افتراضيًا = تحليل الكتب (analyze_book) معطَّل بوضوح —
	// نفس نمط مفاتيح AI الاختيارية عمومًا. Gemini File API يقرأ ملف PDF
	// كاملًا مباشرة (فهم مستندي أصلي)، يستبدل استخراج النص المحلي
	// (pdftotext/مكتبة Go) الذي كان مُستخدَمًا سابقًا — قرار اتُّخذ بعد اختبار
	// حي أظهر أن استخراج النص المحلي + Together AI لم يعطيا فهمًا كافيًا
	// لكتاب حقيقي. توليد الأسئلة (E04) يبقى على Together AI في services/api
	// دون تغيير — worker لا يحتاج مفتاح Together إطلاقًا الآن.
	GeminiAPIKey string
	GeminiModel  string
}

func Load() *Config {
	// Overload لا Load: قيم .env المحلي يجب أن تفوز دائمًا على أي متغير بيئة
	// عام ملوَّث في جهاز المطوّر — راجع نفس التعليق في services/api/internal/config/config.go
	// (سبب اكتشاف هذا الخلل فعليًا: TOGETHER_API_KEY كان مضبوطًا Windows User
	// بقيمة مختلفة من أداة أخرى، فتجاهلت Load قيمة .env الصحيحة بصمت).
	_ = godotenv.Overload()

	seconds := 60
	if v := os.Getenv("JOB_INTERVAL_SECONDS"); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			seconds = i
		}
	}

	return &Config{
		AppEnv:       getEnv("APP_ENV", "development"),
		DatabaseURL:  getEnv("DATABASE_URL", ""),
		JobInterval:  time.Duration(seconds) * time.Second,
		StorageDir:   getEnv("STORAGE_DIR", "./storage"),
		GeminiAPIKey: getEnv("GEMINI_API_KEY", ""),
		GeminiModel:  getEnv("GEMINI_MODEL", "gemini-2.0-flash"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
