DROP INDEX IF EXISTS idx_student_mistakes_user_question;
DROP INDEX IF EXISTS idx_attempt_results_attempt;
ALTER TABLE attempt_results DROP COLUMN IF EXISTS skill_breakdown;
