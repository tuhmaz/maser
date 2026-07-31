package jobs

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// aiJobHandler ينفّذ منطق مهمة AI واحدة. لا معالجات حقيقية بعد (تصل مع Epic
// E04 — اختيار مزوّد AI)؛ noop فقط لإثبات آلية السحب/الإكمال/إعادة المحاولة
// (Epic E02، docs/ai-curriculum-roadmap.md).
type aiJobHandler func(ctx context.Context, db *pgxpool.Pool, payload json.RawMessage) error

var aiJobHandlers = map[string]aiJobHandler{
	"noop": func(ctx context.Context, db *pgxpool.Pool, payload json.RawMessage) error {
		return nil
	},
}

// أقصى عدد مهام تُسحَب في دورة واحدة، كي لا يحتكر طابور AI الدورة كلها على حساب بقية المهام الدورية.
const aiJobBatchCap = 20

// ProcessAIJobs يسحب مهام AI المعلَّقة من ai_jobs ويعالجها. السحب عبر
// FOR UPDATE SKIP LOCKED داخل معاملة قصيرة — يمنع تعارض عدة نسخ من الـworker
// على نفس الصف دون قفل الجدول كله (يدعم لاحقًا تشغيل أكثر من نسخة worker).
type ProcessAIJobs struct{}

func (ProcessAIJobs) Name() string { return "process_ai_jobs" }

func (ProcessAIJobs) Run(ctx context.Context, db *pgxpool.Pool) error {
	for i := 0; i < aiJobBatchCap; i++ {
		job, err := claimNextAIJob(ctx, db)
		if err != nil {
			return err
		}
		if job == nil {
			return nil // لا مهام معلَّقة جاهزة للسحب
		}
		finishAIJob(ctx, db, job)
	}
	return nil
}

type aiJob struct {
	id          string
	jobType     string
	payload     json.RawMessage
	attempts    int
	maxAttempts int
}

func claimNextAIJob(ctx context.Context, db *pgxpool.Pool) (*aiJob, error) {
	tx, err := db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback(ctx)
		}
	}()

	var j aiJob
	err = tx.QueryRow(ctx, `
		SELECT id, job_type, payload, attempts, max_attempts
		FROM ai_jobs
		WHERE status = 'pending' AND available_at <= now()
		ORDER BY created_at
		FOR UPDATE SKIP LOCKED
		LIMIT 1
	`).Scan(&j.id, &j.jobType, &j.payload, &j.attempts, &j.maxAttempts)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	if _, err := tx.Exec(ctx, `UPDATE ai_jobs SET status = 'processing', updated_at = now() WHERE id = $1`, j.id); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	committed = true
	return &j, nil
}

// finishAIJob ينفّذ المعالج المسجَّل لنوع المهمة، ثم يُكمل المهمة أو يعيدها
// لطابور الانتظار بتأخير تصاعدي (backoff خطي: 30 ثانية × رقم المحاولة) حتى
// max_attempts، وبعدها تُوسَم "failed" نهائيًا دون إعادة محاولة تلقائية أخرى.
func finishAIJob(ctx context.Context, db *pgxpool.Pool, job *aiJob) {
	handler, ok := aiJobHandlers[job.jobType]
	var runErr error
	if !ok {
		runErr = fmt.Errorf("لا معالج مسجَّل لنوع المهمة %q", job.jobType)
	} else {
		runErr = handler(ctx, db, job.payload)
	}

	if runErr == nil {
		if _, err := db.Exec(ctx, `UPDATE ai_jobs SET status = 'completed', updated_at = now() WHERE id = $1`, job.id); err != nil {
			log.Printf("[worker] فشل تحديث مهمة AI %s إلى completed: %v", job.id, err)
		}
		return
	}

	attempts := job.attempts + 1
	if attempts >= job.maxAttempts {
		if _, err := db.Exec(ctx, `
			UPDATE ai_jobs SET status = 'failed', attempts = $2, last_error = $3, updated_at = now() WHERE id = $1
		`, job.id, attempts, runErr.Error()); err != nil {
			log.Printf("[worker] فشل تحديث مهمة AI %s إلى failed: %v", job.id, err)
		}
		return
	}

	availableAt := time.Now().Add(time.Duration(attempts) * 30 * time.Second)
	if _, err := db.Exec(ctx, `
		UPDATE ai_jobs SET status = 'pending', attempts = $2, last_error = $3, available_at = $4, updated_at = now() WHERE id = $1
	`, job.id, attempts, runErr.Error(), availableAt); err != nil {
		log.Printf("[worker] فشل إعادة جدولة مهمة AI %s: %v", job.id, err)
	}
}
