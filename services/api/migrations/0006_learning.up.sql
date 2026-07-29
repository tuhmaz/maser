-- 0006_learning.up.sql
-- إتقان المهارات، دفتر الأخطاء، المراجعة المجدولة، الخطة اليومية، الإنجازات

CREATE TABLE student_skill_mastery (
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id            UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    state               TEXT NOT NULL DEFAULT 'not_started'
                          CHECK (state IN ('not_started', 'introduced', 'practicing', 'developing', 'mastered', 'needs_review')),
    questions_seen      INT NOT NULL DEFAULT 0,
    correct_count       INT NOT NULL DEFAULT 0,
    incorrect_count     INT NOT NULL DEFAULT 0,
    last_answered_at    TIMESTAMPTZ,
    last_state_reason   TEXT, -- شرح مفهوم لسبب التصنيف الحالي (شرط قبول إلزامي)
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, skill_id)
);
CREATE INDEX idx_skill_mastery_state ON student_skill_mastery(state);

CREATE TABLE student_mistakes (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id       UUID NOT NULL REFERENCES questions(id),
    skill_id          UUID NOT NULL REFERENCES skills(id),
    attempt_answer_id UUID NOT NULL REFERENCES attempt_answers(id),
    mistake_count     INT NOT NULL DEFAULT 1,
    mastery_state     TEXT NOT NULL DEFAULT 'new'
                        CHECK (mastery_state IN ('new', 'reviewing_soon', 'reviewing_later', 'stabilizing', 'mastered')),
    last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_student_mistakes_user ON student_mistakes(user_id);
CREATE INDEX idx_student_mistakes_user_skill ON student_mistakes(user_id, skill_id);

CREATE TABLE review_schedules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mistake_id  UUID NOT NULL REFERENCES student_mistakes(id) ON DELETE CASCADE,
    due_at      TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_review_schedules_due ON review_schedules(due_at) WHERE completed_at IS NULL;

CREATE TABLE daily_plans (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_date   DATE NOT NULL,
    plan_type   TEXT NOT NULL DEFAULT 'regular' CHECK (plan_type IN ('short', 'regular', 'review', 'catch_up')),
    estimated_minutes INT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, plan_date)
);

CREATE TABLE daily_tasks (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_plan_id UUID NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
    task_type     TEXT NOT NULL CHECK (task_type IN ('short_review', 'explanation', 'new_questions', 'mistake_question', 'stabilization_test')),
    "order"       INT NOT NULL DEFAULT 1,
    payload       JSONB NOT NULL DEFAULT '{}',
    status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_daily_tasks_plan ON daily_tasks(daily_plan_id);

CREATE TABLE task_completions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_task_id  UUID NOT NULL REFERENCES daily_tasks(id) ON DELETE CASCADE,
    completed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student_streaks (
    user_id            UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_streak     INT NOT NULL DEFAULT 0,
    longest_streak     INT NOT NULL DEFAULT 0,
    last_activity_date DATE,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE achievements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key         TEXT NOT NULL UNIQUE, -- first_quiz, first_task, first_mistake_reviewed, first_skill_mastered, streak_3, ...
    title       TEXT NOT NULL,
    description TEXT
);

CREATE TABLE student_achievements (
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, achievement_id)
);
