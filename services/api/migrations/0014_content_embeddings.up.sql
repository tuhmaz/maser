-- 0014_content_embeddings.up.sql
-- بنية تحتية فقط (E01 من docs/ai-curriculum-roadmap.md): تفعيل pgvector
-- داخل PostgreSQL نفسه (لا خدمة بحث متجهي خارجية) وجدول تضمينات عام. لا
-- توليد فعلي للتضمينات هنا — يبقى فارغًا حتى اختيار مزوّد AI (Epic E04).

CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TABLE content_embeddings (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type TEXT NOT NULL CHECK (content_type IN ('lesson', 'skill', 'question_version')),
    content_id   UUID NOT NULL,
    model        TEXT NOT NULL, -- اسم نموذج التضمين المُستخدَم (يُحدَّد فعليًا في E04)
    embedding    vector(1536) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (content_type, content_id, model)
);

CREATE INDEX idx_content_embeddings_content ON content_embeddings(content_type, content_id);
