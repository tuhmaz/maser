-- 0005_quizzes_attempts.up.sql
-- محرك الاختبارات: تعريف الاختبارات والمحاولات

CREATE TABLE quizzes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_type   TEXT NOT NULL CHECK (quiz_type IN ('diagnostic', 'lesson', 'unit', 'review', 'daily')),
    lesson_id   UUID REFERENCES lessons(id),
    unit_id     UUID REFERENCES units(id),
    subject_id  UUID REFERENCES subjects(id),
    title       TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quizzes_type ON quizzes(quiz_type);

CREATE TABLE quiz_sections (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id  UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    title    TEXT,
    "order"  INT NOT NULL DEFAULT 1
);

CREATE TABLE quiz_questions (
    quiz_id      UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    section_id   UUID REFERENCES quiz_sections(id) ON DELETE CASCADE,
    question_id  UUID NOT NULL REFERENCES questions(id),
    "order"      INT NOT NULL DEFAULT 1,
    PRIMARY KEY (quiz_id, question_id)
);

CREATE TABLE attempts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_id         UUID REFERENCES quizzes(id), -- NULL إن كانت محاولة تشخيصية مولَّدة ديناميكيًا
    attempt_type    TEXT NOT NULL CHECK (attempt_type IN ('diagnostic', 'lesson', 'unit', 'review', 'daily')),
    status          TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'abandoned')),
    question_order  UUID[] NOT NULL DEFAULT '{}', -- ترتيب ثابت للأسئلة عند إنشاء المحاولة
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attempts_user ON attempts(user_id);
CREATE INDEX idx_attempts_status ON attempts(status);
CREATE INDEX idx_attempts_created_at ON attempts(created_at);

-- إجابة الطالب لكل سؤال داخل المحاولة، مع نسخة كاملة من السؤال وقت الإجابة
-- (حتى لو تغيّر السؤال لاحقًا، تبقى النتيجة القديمة قابلة للمراجعة بدقة)
CREATE TABLE attempt_answers (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id        UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    question_id       UUID NOT NULL REFERENCES questions(id),
    question_version_id UUID NOT NULL REFERENCES question_versions(id),
    question_snapshot JSONB NOT NULL, -- نسخة كاملة من نص السؤال/الخيارات وقت الإجابة
    answer_given      JSONB NOT NULL,
    is_correct        BOOLEAN,
    time_spent_ms     INT,
    answered_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (attempt_id, question_id)
);
CREATE INDEX idx_attempt_answers_attempt ON attempt_answers(attempt_id);

CREATE TABLE attempt_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- started, answer_saved, submitted, resumed, ...
    metadata   JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attempt_events_attempt ON attempt_events(attempt_id);

CREATE TABLE attempt_results (
    attempt_id      UUID PRIMARY KEY REFERENCES attempts(id) ON DELETE CASCADE,
    score           NUMERIC NOT NULL,
    correct_count   INT NOT NULL,
    total_count     INT NOT NULL,
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
