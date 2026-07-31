-- 0008_attempt_result_details.up.sql
-- تفاصيل نتيجة المحاولة على مستوى المهارة + تفسير التصنيف (شرط قبول docs/mastery-model.md:
-- "يجب أن يستطيع النظام تفسير سبب التصنيف" — لا يكفي رقم غامض).

ALTER TABLE attempt_results
    ADD COLUMN IF NOT EXISTS skill_breakdown JSONB NOT NULL DEFAULT '[]';

-- تعليمة idempotency: منع تسليم نفس المحاولة مرتين بشكل متسابق
CREATE UNIQUE INDEX IF NOT EXISTS idx_attempt_results_attempt ON attempt_results(attempt_id);

-- upsert دفتر الأخطاء: خطأ واحد لكل (طالب، سؤال) يتراكم عدّاده بدل التكرار
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_mistakes_user_question
    ON student_mistakes(user_id, question_id);
