// Package audit يسجّل عمليات الإدارة الحساسة في audit_logs
// (docs/security-requirements.md: سجل تدقيق لعمليات الإدارة).
package audit

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Log يكتب سطرًا في audit_logs. لا يوقف العملية الأصلية إن فشل التسجيل نفسه —
// التدقيق لا يجب أن يمنع عملًا إداريًا مشروعًا من الاكتمال.
func Log(ctx context.Context, db *pgxpool.Pool, actorID, action, entityType, entityID string, metadata map[string]any) {
	meta, _ := json.Marshal(metadata)
	_, _ = db.Exec(ctx, `
		INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
		VALUES (NULLIF($1, '')::uuid, $2, $3, NULLIF($4, '')::uuid, $5)
	`, actorID, action, entityType, entityID, meta)
}
