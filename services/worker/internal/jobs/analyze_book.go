package jobs

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/worker/internal/config"
	"github.com/alemedu/worker/internal/gemini"
)

const bookAnalysisSystemPrompt = `أنت مساعد لتحليل كتب المنهاج المدرسي الأردني. ` +
	`اقرأ ملف PDF المرفق كاملًا (كتاب مدرسي). ` +
	`استخرج هيكل الوحدات والدروس كما يظهر فعليًا في الكتاب، واقترح لكل درس قائمة مهارات ` +
	`تعليمية قصيرة منطقية بناءً على محتواه الفعلي. أعد إجابتك بصيغة JSON فقط بالشكل التالي دون أي نص إضافي: ` +
	`{"units": [{"name": "اسم الوحدة", "lessons": [{"name": "اسم الدرس", "skills": ["مهارة 1", "مهارة 2"]}]}]}. ` +
	`إن لم تجد هيكلًا واضحًا، أعد {"units": []} بدل اختلاق محتوى غير موجود.`

// runAnalyzeBook يرفع كتاب PDF مرفوع (subject_books) إلى Gemini File API
// (فهم مستندي أصلي — يقرأ الملف كاملًا، لا استخراج نص محلي مسبق) ويطلب منه
// اقتراح هيكل وحدات/دروس/مهارات، ثم يخزّن النتيجة في book_analyses كمسودة
// للمراجعة البشرية — لا يكتب أي شيء في units/lessons/skills الحقيقية.
// فشل الرفع/التحليل يُسجَّل في book_analyses (status='failed') ولا يُفشل
// المهمة نفسها في ai_jobs (من منظور الطابور، أُنجزت المهمة ونتيجتها موثَّقة).
func runAnalyzeBook(ctx context.Context, db *pgxpool.Pool, cfg *config.Config, payload json.RawMessage) error {
	var input struct {
		SubjectBookID string `json:"subjectBookId"`
	}
	if err := json.Unmarshal(payload, &input); err != nil {
		return fmt.Errorf("حمولة مهمة analyze_book غير صالحة: %w", err)
	}

	var storagePath string
	if err := db.QueryRow(ctx, `SELECT storage_path FROM subject_books WHERE id = $1`, input.SubjectBookID).Scan(&storagePath); err != nil {
		return fmt.Errorf("تعذّر جلب الكتاب %s: %w", input.SubjectBookID, err)
	}

	var analysisID string
	if err := db.QueryRow(ctx, `
		INSERT INTO book_analyses (subject_book_id, status) VALUES ($1, 'processing') RETURNING id
	`, input.SubjectBookID).Scan(&analysisID); err != nil {
		return fmt.Errorf("تعذّر إنشاء سجل التحليل: %w", err)
	}

	if cfg.GeminiAPIKey == "" {
		markBookAnalysisFailed(ctx, db, analysisID, "تحليل الكتب عبر AI غير مُفعَّل على هذا الخادم (GEMINI_API_KEY غير مضبوط)")
		return nil
	}

	pdfBytes, err := os.ReadFile(filepath.Join(cfg.StorageDir, filepath.FromSlash(storagePath)))
	if err != nil {
		markBookAnalysisFailed(ctx, db, analysisID, fmt.Sprintf("تعذّر قراءة ملف الكتاب: %v", err))
		return nil
	}

	client := gemini.NewGeminiClient(cfg.GeminiAPIKey)
	raw, err := client.AnalyzePDF(ctx, cfg.GeminiModel, pdfBytes, bookAnalysisSystemPrompt)
	if err != nil {
		markBookAnalysisFailed(ctx, db, analysisID, fmt.Sprintf("تعذّر الاتصال بـGemini: %v", err))
		return nil
	}

	var structure map[string]any
	if err := json.Unmarshal([]byte(raw), &structure); err != nil {
		markBookAnalysisFailed(ctx, db, analysisID, "رد Gemini لم يكن بصيغة JSON صالحة")
		return nil
	}

	if _, err := db.Exec(ctx, `
		UPDATE book_analyses SET status = 'completed', proposed_structure = $2, completed_at = now() WHERE id = $1
	`, analysisID, raw); err != nil {
		return fmt.Errorf("تعذّر حفظ نتيجة التحليل: %w", err)
	}
	return nil
}

func markBookAnalysisFailed(ctx context.Context, db *pgxpool.Pool, analysisID, message string) {
	if _, err := db.Exec(ctx, `
		UPDATE book_analyses SET status = 'failed', error_message = $2, completed_at = now() WHERE id = $1
	`, analysisID, message); err != nil {
		fmt.Printf("[worker] فشل تسجيل فشل تحليل الكتاب %s: %v\n", analysisID, err)
	}
}
