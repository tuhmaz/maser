-- 0018_subject_books.up.sql
-- بنية تحتية لرفع كتب المادة (طالب/تمارين/معلم) وتحليل AI غير متزامن لهيكل
-- المنهاج كمسودة قابلة للمراجعة (docs/ai-curriculum-roadmap.md — E10 مرحلة 1).
-- proposed_structure مسودة صرفة بلا FK لأي جدول منهاج حقيقي — الاستيراد
-- الفعلي للمنهاج حزمة تالية منفصلة.

CREATE TABLE subject_books (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id   UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    book_type    TEXT NOT NULL CHECK (book_type IN ('student', 'exercises', 'teacher')),
    storage_path TEXT NOT NULL, -- مسار نسبي لقراءته لاحقًا من القرص في worker
    url          TEXT NOT NULL,
    uploaded_by  UUID NOT NULL REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (subject_id, book_type)
);

CREATE TABLE book_analyses (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_book_id    UUID NOT NULL REFERENCES subject_books(id) ON DELETE CASCADE,
    status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    proposed_structure JSONB,
    error_message      TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at       TIMESTAMPTZ
);

CREATE INDEX idx_book_analyses_subject_book ON book_analyses(subject_book_id);
