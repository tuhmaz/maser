-- 0004_questions.up.sql
-- الأسئلة ودورة حياة المحتوى

CREATE TABLE questions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_id          UUID NOT NULL REFERENCES grades(id),
    subject_id        UUID NOT NULL REFERENCES subjects(id),
    unit_id           UUID NOT NULL REFERENCES units(id),
    lesson_id         UUID NOT NULL REFERENCES lessons(id),
    question_type     TEXT NOT NULL CHECK (question_type IN
                        ('single_choice', 'true_false', 'numeric_input', 'multi_select', 'ordering', 'matching')),
    difficulty        TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    expected_time_sec INT NOT NULL DEFAULT 60,
    status            TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'in_review', 'changes_requested', 'approved', 'published', 'archived')),
    source            TEXT NOT NULL DEFAULT 'human' CHECK (source IN ('human', 'ai_assisted')),
    current_version   INT NOT NULL DEFAULT 1,
    created_by        UUID NOT NULL REFERENCES users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at       TIMESTAMPTZ
);
CREATE INDEX idx_questions_lesson ON questions(lesson_id);
CREATE INDEX idx_questions_status ON questions(status);

-- إصدارات السؤال: كل نشر جديد بعد تعديل جوهري ينشئ صفًا هنا
-- ولا يُعدَّل الإصدار المنشور سابقًا لضمان عدم تغيير نتائج قديمة
CREATE TABLE question_versions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id    UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    body           TEXT NOT NULL, -- نص السؤال
    explanation    TEXT,          -- تفسير الحل
    published_at   TIMESTAMPTZ,
    created_by     UUID NOT NULL REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (question_id, version_number)
);
CREATE INDEX idx_question_versions_question ON question_versions(question_id);

CREATE TABLE question_options (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_version_id UUID NOT NULL REFERENCES question_versions(id) ON DELETE CASCADE,
    text              TEXT NOT NULL,
    is_correct        BOOLEAN NOT NULL DEFAULT false,
    wrong_reason      TEXT, -- سبب خطأ هذا الخيار تحديدًا
    "order"           INT NOT NULL DEFAULT 1
);
CREATE INDEX idx_question_options_version ON question_options(question_version_id);

-- للأسئلة العددية أو التي لا تعتمد خيارات (numeric_input)
CREATE TABLE question_answers (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_version_id  UUID NOT NULL REFERENCES question_versions(id) ON DELETE CASCADE,
    answer_value          TEXT NOT NULL,
    tolerance             NUMERIC -- هامش خطأ مقبول للأسئلة العددية
);

CREATE TABLE question_explanations (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_version_id  UUID NOT NULL REFERENCES question_versions(id) ON DELETE CASCADE,
    body                 TEXT NOT NULL
);

CREATE TABLE question_media (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_version_id UUID NOT NULL REFERENCES question_versions(id) ON DELETE CASCADE,
    media_type    TEXT NOT NULL CHECK (media_type IN ('image', 'audio', 'video')),
    url           TEXT NOT NULL, -- على assets.alemedu.com / Object Storage
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE question_skills (
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    skill_id    UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (question_id, skill_id)
);
CREATE INDEX idx_question_skills_skill ON question_skills(skill_id);

CREATE TABLE question_tags (
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    tag         TEXT NOT NULL,
    PRIMARY KEY (question_id, tag)
);

CREATE TABLE question_reports (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    reported_by UUID REFERENCES users(id),
    reason      TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);
CREATE INDEX idx_question_reports_question ON question_reports(question_id);
