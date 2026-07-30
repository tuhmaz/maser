package jobs

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// GenerateDailyPlans (احتياطي/مستقبلي).
//
// التوليد الفعلي للخطة اليومية أصبح عند الطلب (on-demand) عبر
// POST /daily-plan/generate في services/api/internal/service/daily_plan_service.go
// — يُستدعى تلقائيًا عندما يفتح الطالب صفحة /today ولا توجد خطة لليوم بعد،
// وهو عديم التأثير الجانبي المكرر (خطة واحدة لكل طالب في اليوم).
//
// هذه المهمة الخلفية محجوزة لتوليد استباقي جماعي (قبل بدء يوم الطالب، دفعة
// واحدة لكل الطلاب النشطين) إن استدعت الحاجة لاحقًا تحسين زمن استجابة أول
// فتح لصفحة /today. تعمّد عدم تكرار منطق البناء هنا داخل وحدة Go منفصلة
// (services/worker مستقل عن services/api) تجنبًا لتضارب خوارزميتين مختلفتين
// لنفس القرار المنتجي.
type GenerateDailyPlans struct{}

func (GenerateDailyPlans) Name() string { return "generate_daily_plans" }

func (GenerateDailyPlans) Run(ctx context.Context, db *pgxpool.Pool) error {
	return nil
}
