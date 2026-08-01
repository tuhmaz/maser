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

	// TogetherAPIKey فارغ افتراضيًا = مهام تحليل AI (مثل analyze_book) تفشل
	// بوضوح بدل محاولة استدعاء مزوّد بلا مفتاح — نفس نمط services/api.
	TogetherAPIKey string

	// StorageDir يجب أن يطابق STORAGE_DIR في services/api (نفس القرص) — الـworker
	// يقرأ ملفات مرفوعة (كتب PDF) مباشرة من هنا، لا عبر storage.Storage
	// (لا وحدة مشتركة لهذا التجريد بين api وworker — راجع docs/ai-curriculum-roadmap.md، E10).
	StorageDir string

	// PdftotextPath مسار صريح لثنائي pdftotext (poppler) — اختياري. فارغ
	// افتراضيًا: يُحاول exec.LookPath("pdftotext") العادي (يعمل بلا ضبط على
	// Linux مع poppler-utils مثبَّتًا)، وإن فشل يُستخدم مستخرج Go الخالص
	// كبديل أضعف. اضبطه صراحةً إن كان "pdftotext" على PATH يشير لنسخة أخرى
	// غير poppler الحقيقية (حدث فعليًا على Windows: Git for Windows يُرفق
	// نسخة poppler قديمة 4.00 تسبق poppler الحقيقي في PATH وتفشل مع أسماء
	// ملفات عربية ومحتوى عربي حقيقي).
	PdftotextPath string
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
		AppEnv:         getEnv("APP_ENV", "development"),
		DatabaseURL:    getEnv("DATABASE_URL", ""),
		JobInterval:    time.Duration(seconds) * time.Second,
		TogetherAPIKey: getEnv("TOGETHER_API_KEY", ""),
		StorageDir:     getEnv("STORAGE_DIR", "./storage"),
		PdftotextPath:  getEnv("PDFTOTEXT_PATH", ""),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
