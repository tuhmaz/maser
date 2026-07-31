package repository

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AIJobRepository جانب الإنتاج (producer) لطابور ai_jobs — بنية تحتية فقط
// (docs/ai-curriculum-roadmap.md، E02). السحب والمعالجة الفعلية في
// services/worker/internal/jobs/process_ai_jobs.go عبر FOR UPDATE SKIP LOCKED
// على نفس الجدول. لا مُستهلِك حقيقي بعد (يصل مع Epic E04).
type AIJobRepository struct {
	db Querier
}

func NewAIJobRepository(db *pgxpool.Pool) *AIJobRepository {
	return &AIJobRepository{db: db}
}

// WithTx يعيد نسخة من المستودع تعمل داخل معاملة قائمة بدل المجمّع مباشرة —
// يسمح بإدراج مهمة AI ذرّيًا مع عملية أخرى (مثلًا حفظ مسودة سؤال).
func (r *AIJobRepository) WithTx(tx pgx.Tx) *AIJobRepository {
	return &AIJobRepository{db: tx}
}

// Enqueue يضيف مهمة جديدة بحالة pending. payload يُسلسَل إلى JSONB.
func (r *AIJobRepository) Enqueue(ctx context.Context, jobType string, payload any) (string, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	var id string
	err = r.db.QueryRow(ctx, `
		INSERT INTO ai_jobs (job_type, payload) VALUES ($1, $2) RETURNING id
	`, jobType, body).Scan(&id)
	return id, err
}
