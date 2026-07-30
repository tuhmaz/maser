// Package cache يوفّر عميل Redis مشتركًا يُستخدم كمخزن لمحدِّد المعدل (rate
// limiter) ولتخزين مؤقت خفيف للمناهج العامة (docs/deployment-plan.md: الأداء).
package cache

import (
	"github.com/gofiber/storage/redis/v3"
)

// NewStorage ينشئ مخزن Fiber متوافق (يُستخدم في middleware.RequireAuth أو
// limiter.Config{Storage: ...}). redisURL بصيغة redis://host:port/db.
func NewStorage(redisURL string) *redis.Storage {
	return redis.New(redis.Config{
		URL: redisURL,
	})
}
