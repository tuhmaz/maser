-- 0002_students_parents.up.sql
-- ملفات الطلاب وأولياء الأمور

CREATE TABLE student_profiles (
    user_id            UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    grade_id           UUID, -- FK إلى grades تُضاف بعد إنشاء جدول grades (0003)
    academic_year_id   UUID,
    semester_id        UUID,
    language           TEXT NOT NULL DEFAULT 'ar',
    timezone           TEXT NOT NULL DEFAULT 'Asia/Amman',
    onboarding_status  TEXT NOT NULL DEFAULT 'not_started'
                        CHECK (onboarding_status IN ('not_started', 'in_progress', 'completed')),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student_preferences (
    user_id                 UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    reduced_motion          BOOLEAN NOT NULL DEFAULT false,
    hide_from_public_ranks  BOOLEAN NOT NULL DEFAULT true,
    notifications_enabled   BOOLEAN NOT NULL DEFAULT true,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student_subjects (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL, -- FK إلى subjects تُضاف في 0003
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, subject_id)
);

CREATE TABLE parent_profiles (
    user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE parent_student_links (
    parent_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (parent_user_id, student_user_id)
);
