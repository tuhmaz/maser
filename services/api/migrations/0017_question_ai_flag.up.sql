-- 0017_question_ai_flag.up.sql
-- يميّز الأسئلة المولَّدة عبر AI (E04) في القوائم الإدارية دون الاعتماد على
-- سجل التدقيق العام (audit_logs) لاستعلامات تشغيلية متكررة.

ALTER TABLE questions ADD COLUMN generated_by_ai BOOLEAN NOT NULL DEFAULT false;
