-- 0012_daily_task_attempt_link.up.sql
-- يربط محاولة الاختبار بالمهمة اليومية التي أنشأتها، حتى يمكن استئناف نفس
-- المحاولة بدل إنشاء عدة محاولات عند إعادة الضغط، ولإكمال المهمة تلقائيًا
-- عند تسليم الاختبار (تقرير المراجعة §8.4، §8.5، §8.8).

ALTER TABLE attempts ADD COLUMN daily_task_id UUID REFERENCES daily_tasks(id) ON DELETE SET NULL;
CREATE INDEX idx_attempts_daily_task ON attempts(daily_task_id);

-- إتمام واحد فقط لكل مهمة (كان بلا قيد، فيمكن أن تتكرر صفوف completed_at لنفس المهمة)
CREATE UNIQUE INDEX idx_task_completions_task ON task_completions(daily_task_id);
