package jobs

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os/exec"
	"path/filepath"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ledongthuc/pdf"

	"github.com/alemedu/togetherai"
	"github.com/alemedu/worker/internal/config"
)

// أقصى عدد أحرف نص يُرسَل لـTogether AI — يكفي عادة لتغطية جدول المحتويات
// وبداية الوحدات في كتاب مدرسي (مرحلة أولى من التحليل، docs/ai-curriculum-roadmap.md
// — E10). تحليل عميق لكل درس على حدة نطاق حزمة لاحقة، ليس هذه.
const maxBookTextChars = 30_000

const bookAnalysisSystemPrompt = `أنت مساعد لتحليل كتب المنهاج المدرسي الأردني. ` +
	`تحصل على نص من بداية كتاب مدرسي (عادة يحوي جدول المحتويات). ` +
	`استخرج هيكل الوحدات والدروس كما يظهر فعليًا في النص، واقترح لكل درس قائمة مهارات ` +
	`تعليمية قصيرة منطقية بناءً على اسمه. أعد إجابتك بصيغة JSON فقط بالشكل التالي دون أي نص إضافي: ` +
	`{"units": [{"name": "اسم الوحدة", "lessons": [{"name": "اسم الدرس", "skills": ["مهارة 1", "مهارة 2"]}]}]}. ` +
	`إن لم تجد هيكلًا واضحًا في النص، أعد {"units": []} بدل اختلاق محتوى غير موجود.`

// runAnalyzeBook يستخرج نص كتاب PDF مرفوع (subject_books) ويطلب من Together AI
// اقتراح هيكل وحدات/دروس/مهارات، ثم يخزّن النتيجة في book_analyses كمسودة
// للمراجعة البشرية — لا يكتب أي شيء في units/lessons/skills الحقيقية.
// فشل الاستخراج/التحليل يُسجَّل في book_analyses (status='failed') ولا يُفشل
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

	text, err := extractBookText(ctx, cfg, filepath.Join(cfg.StorageDir, filepath.FromSlash(storagePath)))
	if err != nil {
		markBookAnalysisFailed(ctx, db, analysisID, fmt.Sprintf("تعذّر استخراج نص الملف: %v", err))
		return nil
	}

	if cfg.TogetherAPIKey == "" {
		markBookAnalysisFailed(ctx, db, analysisID, "توليد التحليل عبر AI غير مُفعَّل على هذا الخادم (TOGETHER_API_KEY غير مضبوط)")
		return nil
	}

	client := togetherai.NewTogetherClient(cfg.TogetherAPIKey)
	raw, err := client.Complete(ctx, "meta-llama/Llama-3.3-70B-Instruct-Turbo", bookAnalysisSystemPrompt, text)
	if err != nil {
		markBookAnalysisFailed(ctx, db, analysisID, fmt.Sprintf("تعذّر الاتصال بمزوّد AI: %v", err))
		return nil
	}

	var structure map[string]any
	if err := json.Unmarshal([]byte(raw), &structure); err != nil {
		markBookAnalysisFailed(ctx, db, analysisID, "رد مزوّد AI لم يكن بصيغة JSON صالحة")
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

// extractBookText يستخرج نصًا خالصًا من PDF (طبقة نص رقمية فقط، لا OCR —
// كتب ممسوحة ضوئيًا كصور خارج نطاق هذه المرحلة) ويحدّه بـmaxBookTextChars.
// يُفضَّل pdftotext (poppler) عند توفره: مكتبة Go الخالصة (ledongthuc/pdf)
// أثبتت فعليًا فشلها في فك ترميز خطوط بعض ملفات PDF العربية الحقيقية
// (تُنتج نصًا مشوَّهًا غير قابل للقراءة رغم نجاح الاستخراج تقنيًا) — اكتُشف
// هذا بالتحقق على كتاب حقيقي صادر عن المركز الوطني لتطوير المناهج الأردني.
func extractBookText(ctx context.Context, cfg *config.Config, absPath string) (string, error) {
	if text, err := extractWithPdftotext(ctx, cfg, absPath); err == nil {
		return text, nil
	}
	return extractWithPureGo(absPath)
}

// extractWithPdftotext يشغّل pdftotext الفعلي (لا يعتمد على "pdftotext" على
// PATH وحدها إن كان cfg.PdftotextPath مضبوطًا صراحةً — على Windows قد يسبق
// PATH نسخة قديمة معطوبة من Git for Windows نسخة poppler الحقيقية).
func extractWithPdftotext(ctx context.Context, cfg *config.Config, absPath string) (string, error) {
	binary := cfg.PdftotextPath
	if binary == "" {
		resolved, err := exec.LookPath("pdftotext")
		if err != nil {
			return "", fmt.Errorf("pdftotext غير متوفر: %w", err)
		}
		binary = resolved
	}

	cmd := exec.CommandContext(ctx, binary, "-l", "30", absPath, "-")
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("فشل تشغيل pdftotext: %w (%s)", err, stderr.String())
	}

	text := stdout.String()
	if len(text) > maxBookTextChars {
		text = text[:maxBookTextChars]
	}
	if len(text) == 0 {
		return "", fmt.Errorf("pdftotext لم يُنتج أي نص")
	}
	return text, nil
}

// extractWithPureGo بديل أضعف حين لا يتوفر pdftotext إطلاقًا على الخادم.
func extractWithPureGo(absPath string) (string, error) {
	f, r, err := pdf.Open(absPath)
	if err != nil {
		return "", err
	}
	defer f.Close()

	textReader, err := r.GetPlainText()
	if err != nil {
		return "", err
	}

	limited := io.LimitReader(textReader, maxBookTextChars)
	buf, err := io.ReadAll(limited)
	if err != nil {
		return "", err
	}
	if len(buf) == 0 {
		return "", fmt.Errorf("لم يُستخرَج أي نص من الملف (قد يكون كتابًا ممسوحًا ضوئيًا بلا طبقة نص)")
	}
	return string(buf), nil
}
