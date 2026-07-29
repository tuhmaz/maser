ALTER TABLE student_subjects DROP CONSTRAINT IF EXISTS fk_student_subjects_subject;
ALTER TABLE student_profiles
    DROP CONSTRAINT IF EXISTS fk_student_profiles_grade,
    DROP CONSTRAINT IF EXISTS fk_student_profiles_academic_year,
    DROP CONSTRAINT IF EXISTS fk_student_profiles_semester;

DROP TABLE IF EXISTS learning_objectives;
DROP TABLE IF EXISTS skill_prerequisites;
DROP TABLE IF EXISTS lesson_skills;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS lessons;
DROP TABLE IF EXISTS units;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS semesters;
DROP TABLE IF EXISTS grades;
DROP TABLE IF EXISTS academic_years;
DROP TABLE IF EXISTS curricula;
DROP TABLE IF EXISTS countries;
