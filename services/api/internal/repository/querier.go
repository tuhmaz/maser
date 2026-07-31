package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// Querier يوحّد الواجهة بين *pgxpool.Pool و pgx.Tx. يسمح لأي مستودع بالعمل إما
// مباشرة على المجمّع أو داخل معاملة قائمة تُمرَّر من طبقة الخدمة — ضروري
// لعمليات تلمس أكثر من مستودع يجب أن تنجح أو تفشل معًا بالكامل (مثل تسليم
// اختبار كامل: قفل المحاولة + حساب النتيجة + تحديث الإتقان + دفتر الأخطاء).
type Querier interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}
