-- 0011_attempt_question_versions.up.sql
-- يجمّد نسخة كل سؤال عند بدء المحاولة — تعديل/إعادة نشر السؤال لاحقًا لا يؤثر
-- على محاولة بدأت قبل ذلك (docs/question-model.md، تقرير المراجعة §6.1).

CREATE TABLE attempt_questions (
    attempt_id           UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    question_id          UUID NOT NULL REFERENCES questions(id),
    question_version_id  UUID NOT NULL REFERENCES question_versions(id),
    "order"              INT NOT NULL,
    PRIMARY KEY (attempt_id, question_id)
);
CREATE INDEX idx_attempt_questions_attempt ON attempt_questions(attempt_id);
