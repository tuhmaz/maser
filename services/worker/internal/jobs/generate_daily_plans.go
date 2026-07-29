package jobs

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// GenerateDailyPlans مسؤول عن توليد خطة اليوم لكل طالب نشط لم تُولَّد خطته بعد.
// المنطق الكامل لتوليد المحتوى (اختيار المراجعة/الشرح/الأسئلة الجديدة) يُبنى
// في مرحلة "بناء المهمة اليومية" من ترتيب التنفيذ — راجع docs/daily-plan-rules.md.
// هذا الملف حاليًا هيكل فقط (no-op آمن) حتى يُستكمَل المنطق.
type GenerateDailyPlans struct{}

func (GenerateDailyPlans) Name() string { return "generate_daily_plans" }

func (GenerateDailyPlans) Run(ctx context.Context, db *pgxpool.Pool) error {
	// TODO: تنفيذ منطق التوليد الكامل حسب docs/daily-plan-rules.md:
	// لكل طالب نشط بلا daily_plans لهذا اليوم:
	//   1) اجلب المهارات الضعيفة والأخطاء المستحقة (review_schedules.due_at <= now())
	//   2) ابنِ daily_plan + daily_tasks (مراجعة قصيرة، شرح، أسئلة جديدة، سؤال من دفتر الأخطاء، اختبار تثبيت)
	//   3) لا تتجاوز قدرة الطالب ولا تعتمد على أسئلة عشوائية فقط
	return nil
}
