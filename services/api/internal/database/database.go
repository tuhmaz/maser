package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// New ينشئ مجمّع اتصالات (connection pool) بقاعدة بيانات PostgreSQL.
// لا تُفتح اتصالات مباشرة من الـ handlers؛ كل الوصول يمر عبر هذا الـ pool.
func New(databaseURL string) (*pgxpool.Pool, error) {
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL غير مضبوط")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("فشل إنشاء connection pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("فشل الاتصال بقاعدة البيانات: %w", err)
	}

	return pool, nil
}
