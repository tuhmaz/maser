// Package analytics يكتب أحداث المنصة في system_events (docs/analytics-events.md).
// قاعدة الخصوصية: لا تُسجَّل نصوص الأسئلة الكاملة ولا بيانات حساسة — فقط
// معرّفات ومقاييس (docs/security-requirements.md، docs/analytics-events.md §قواعد الخصوصية).
package analytics

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"
)

// UTM معلمات القياس عند القدوم من موقع الإيمان (docs/analytics-events.md).
type UTM struct {
	Source   string
	Medium   string
	Campaign string
	Content  string
}

// Track يسجّل حدثًا في system_events. لا يوقف الطلب الأصلي إن فشل — التتبع ثانوي دائمًا.
// userID قد تكون فارغة (زائر غير مسجَّل دخول).
func Track(ctx context.Context, db *pgxpool.Pool, eventName, userID string, properties map[string]any, utm *UTM) {
	if db == nil {
		return
	}
	props, _ := json.Marshal(properties)

	var source, medium, campaign, content string
	if utm != nil {
		source, medium, campaign, content = utm.Source, utm.Medium, utm.Campaign, utm.Content
	}

	_, _ = db.Exec(ctx, `
		INSERT INTO system_events (event_name, user_id, properties, utm_source, utm_medium, utm_campaign, utm_content)
		VALUES ($1, NULLIF($2, '')::uuid, $3, NULLIF($4,''), NULLIF($5,''), NULLIF($6,''), NULLIF($7,''))
	`, eventName, userID, props, source, medium, campaign, content)
}
