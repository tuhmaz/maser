-- 0007_admin_audit.up.sql
-- الإدارة والتدقيق والتحليلات

CREATE TABLE content_reviews (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id  UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    reviewer_id  UUID NOT NULL REFERENCES users(id),
    decision     TEXT NOT NULL CHECK (decision IN ('approved', 'changes_requested')),
    comment      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_content_reviews_question ON content_reviews(question_id);

CREATE TABLE content_publications (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id          UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    question_version_id  UUID NOT NULL REFERENCES question_versions(id),
    published_by         UUID NOT NULL REFERENCES users(id),
    published_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID REFERENCES users(id),
    action      TEXT NOT NULL, -- e.g. "question.publish", "user.role_change"
    entity_type TEXT NOT NULL,
    entity_id   UUID,
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

CREATE TABLE system_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name TEXT NOT NULL, -- من docs/analytics-events.md
    user_id    UUID REFERENCES users(id),
    properties JSONB,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content  TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_system_events_name ON system_events(event_name);
CREATE INDEX idx_system_events_user ON system_events(user_id);
CREATE INDEX idx_system_events_created_at ON system_events(created_at);

CREATE TABLE feature_flags (
    key         TEXT PRIMARY KEY,
    is_enabled  BOOLEAN NOT NULL DEFAULT false,
    rollout_percentage INT NOT NULL DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
    description TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- بذور أعلام الميزات الأساسية (كلها معطلة افتراضيًا حتى قرار صريح)
INSERT INTO feature_flags (key, is_enabled, rollout_percentage, description) VALUES
    ('alemancenter_ad_lesson', false, 0, 'إعلان داخل الدرس على موقع الإيمان'),
    ('alemancenter_ad_homepage', false, 0, 'بطاقة الصفحة الرئيسية على موقع الإيمان'),
    ('ai_content_assist', false, 0, 'مساعدة الذكاء الاصطناعي في إنتاج المحتوى'),
    ('achievements_visual_effects', true, 100, 'المؤثرات البصرية للإنجازات');
