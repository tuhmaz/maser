package jobs

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ExpireAbandonedAttempts يحوّل المحاولات المتوقفة منذ فترة طويلة (in_progress بلا نشاط)
// إلى الحالة "abandoned" بدل بقائها معلّقة إلى الأبد. لا يؤثر هذا على النتيجة المحسوبة
// أصلًا داخل الخادم (راجع docs/daily-plan-rules.md: لا تعتمد النتيجة على الواجهة).
type ExpireAbandonedAttempts struct{}

func (ExpireAbandonedAttempts) Name() string { return "expire_abandoned_attempts" }

func (ExpireAbandonedAttempts) Run(ctx context.Context, db *pgxpool.Pool) error {
	_, err := db.Exec(ctx, `
		UPDATE attempts
		SET status = 'abandoned'
		WHERE status = 'in_progress'
		  AND started_at < now() - INTERVAL '24 hours'
	`)
	return err
}
