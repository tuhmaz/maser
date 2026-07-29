-- 0003_curriculum.up.sql
-- هيكل المنهاج: المرحلة → الصف → السنة → الفصل → المادة → الوحدة → الدرس → المهارة → الهدف التعليمي

CREATE TABLE countries (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    code       TEXT NOT NULL UNIQUE, -- ISO 3166-1 alpha-2, e.g. 'JO'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE curricula (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
    name       TEXT NOT NULL, -- مثال: المنهاج الأردني
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE academic_years (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curriculum_id UUID NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
    name       TEXT NOT NULL, -- مثال: 2025-2026
    start_date DATE,
    end_date   DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE grades (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curriculum_id UUID NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,   -- الصف السابع
    level         INT NOT NULL,    -- 5..12 للترتيب
    is_active     BOOLEAN NOT NULL DEFAULT true, -- هل هذا الصف متاح فعليًا في النسخة الحالية
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_grades_curriculum ON grades(curriculum_id);

CREATE TABLE semesters (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    name             TEXT NOT NULL, -- الفصل الأول
    "order"          INT NOT NULL DEFAULT 1,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subjects (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_id   UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    name       TEXT NOT NULL, -- الرياضيات
    slug       TEXT NOT NULL,
    is_active  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (grade_id, semester_id, slug)
);
CREATE INDEX idx_subjects_grade ON subjects(grade_id);

CREATE TABLE units (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    "order"    INT NOT NULL DEFAULT 1,
    is_active  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_units_subject ON units(subject_id);

CREATE TABLE lessons (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id    UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    summary    TEXT,
    "order"    INT NOT NULL DEFAULT 1,
    is_active  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lessons_unit ON lessons(unit_id);

CREATE TABLE skills (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    description   TEXT,
    difficulty    TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lesson_skills (
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    skill_id  UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (lesson_id, skill_id)
);

-- مصفوفة المتطلبات السابقة بين المهارات
CREATE TABLE skill_prerequisites (
    skill_id            UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    prerequisite_skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (skill_id, prerequisite_skill_id),
    CHECK (skill_id <> prerequisite_skill_id)
);

CREATE TABLE learning_objectives (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id   UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    text       TEXT NOT NULL,
    "order"    INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_learning_objectives_skill ON learning_objectives(skill_id);

-- ربط الجداول المؤجلة من 0002 الآن بعد وجود grades و subjects
ALTER TABLE student_profiles
    ADD CONSTRAINT fk_student_profiles_grade FOREIGN KEY (grade_id) REFERENCES grades(id),
    ADD CONSTRAINT fk_student_profiles_academic_year FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
    ADD CONSTRAINT fk_student_profiles_semester FOREIGN KEY (semester_id) REFERENCES semesters(id);

ALTER TABLE student_subjects
    ADD CONSTRAINT fk_student_subjects_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

-- بذور نطاق النسخة الأولى: الأردن / الصف السابع / الرياضيات / فصل أول
INSERT INTO countries (id, name, code) VALUES
    ('00000000-0000-0000-0000-000000000001', 'الأردن', 'JO');

INSERT INTO curricula (id, country_id, name) VALUES
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'المنهاج الأردني');

INSERT INTO academic_years (id, curriculum_id, name) VALUES
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '2025-2026');

INSERT INTO grades (id, curriculum_id, name, level, is_active) VALUES
    ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'الصف السابع', 7, true);

INSERT INTO semesters (id, academic_year_id, name, "order") VALUES
    ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', 'الفصل الأول', 1);

INSERT INTO subjects (id, grade_id, semester_id, name, slug, is_active) VALUES
    ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', 'الرياضيات', 'math', true);
