-- 0015_ai_jobs.up.sql
-- بنية تحتية فقط (E02 من docs/ai-curriculum-roadmap.md): طابور مهام AI داخل
-- PostgreSQL نفسه (FOR UPDATE SKIP LOCKED) بدل إضافة Redis/Asynq كاعتمادية
-- جديدة — Redis في هذا المشروع مُستخدَم اختياريًا لتخزين محدِّد المعدل فقط
-- وغير موفَّر أصلًا في CI أو خطة الإنتاج (docs/deployment-plan.md).

CREATE TABLE ai_jobs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type     TEXT NOT NULL,
    payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
    status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts     INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    last_error   TEXT,
    available_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- لا يُسحَب قبل هذا الوقت (تأخير إعادة المحاولة)
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- فهرس جزئي: يخدم فقط استعلام السحب (status='pending')، لا يتضخم بالمهام المكتملة/الفاشلة.
CREATE INDEX idx_ai_jobs_pending_dequeue ON ai_jobs(available_at) WHERE status = 'pending';
