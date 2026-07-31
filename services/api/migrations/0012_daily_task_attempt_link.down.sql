-- 0012_daily_task_attempt_link.down.sql
DROP INDEX IF EXISTS idx_task_completions_task;
DROP INDEX IF EXISTS idx_attempts_daily_task;
ALTER TABLE attempts DROP COLUMN IF EXISTS daily_task_id;
