package repository

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/models"
)

var ErrAttemptFinished = errors.New("attempt already finished")

type AttemptRepository struct {
	db *pgxpool.Pool
}

func NewAttemptRepository(db *pgxpool.Pool) *AttemptRepository {
	return &AttemptRepository{db: db}
}

func (r *AttemptRepository) Create(ctx context.Context, userID string, quizID *string, attemptType string, questionOrder []string) (*models.Attempt, error) {
	var a models.Attempt
	err := r.db.QueryRow(ctx, `
		INSERT INTO attempts (user_id, quiz_id, attempt_type, question_order)
		VALUES ($1, $2, $3, $4)
		RETURNING id, user_id, quiz_id, attempt_type, status, question_order, started_at, submitted_at
	`, userID, quizID, attemptType, questionOrder).Scan(
		&a.ID, &a.UserID, &a.QuizID, &a.Type, &a.Status, &a.QuestionOrder, &a.StartedAt, &a.SubmittedAt,
	)
	if err != nil {
		return nil, err
	}
	_, _ = r.db.Exec(ctx, `
		INSERT INTO attempt_events (attempt_id, event_type) VALUES ($1, 'started')
	`, a.ID)
	return &a, nil
}

// GetForUser يجلب المحاولة فقط إذا كانت مملوكة لهذا المستخدم — منع IDOR
// (docs/security-requirements.md: الوصول إلى بيانات طالب آخر).
func (r *AttemptRepository) GetForUser(ctx context.Context, attemptID, userID string) (*models.Attempt, error) {
	var a models.Attempt
	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, quiz_id, attempt_type, status, question_order, started_at, submitted_at
		FROM attempts WHERE id = $1 AND user_id = $2
	`, attemptID, userID).Scan(
		&a.ID, &a.UserID, &a.QuizID, &a.Type, &a.Status, &a.QuestionOrder, &a.StartedAt, &a.SubmittedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &a, nil
}

// SaveAnswer يحفظ إجابة سؤال داخل المحاولة فورًا (upsert):
// إعادة إرسال إجابة لنفس السؤال تستبدل السابقة ولا تكرّرها — idempotency
// على مستوى (attempt_id, question_id) حسب docs/daily-plan-rules.md.
func (r *AttemptRepository) SaveAnswer(ctx context.Context, attemptID string, q *models.FullQuestion, answerGiven json.RawMessage, isCorrect bool, timeSpentMs *int) error {
	snapshot, err := json.Marshal(q)
	if err != nil {
		return err
	}
	_, err = r.db.Exec(ctx, `
		INSERT INTO attempt_answers
			(attempt_id, question_id, question_version_id, question_snapshot, answer_given, is_correct, time_spent_ms)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (attempt_id, question_id) DO UPDATE SET
			answer_given = EXCLUDED.answer_given,
			is_correct = EXCLUDED.is_correct,
			time_spent_ms = EXCLUDED.time_spent_ms,
			answered_at = now()
	`, attemptID, q.ID, q.VersionID, snapshot, answerGiven, isCorrect, timeSpentMs)
	if err != nil {
		return err
	}
	_, _ = r.db.Exec(ctx, `
		INSERT INTO attempt_events (attempt_id, event_type, metadata)
		VALUES ($1, 'answer_saved', jsonb_build_object('questionId', $2::text))
	`, attemptID, q.ID)
	return nil
}

// AnsweredQuestionIDs معرفات الأسئلة المجابة (لاستئناف المحاولة بعد انقطاع).
func (r *AttemptRepository) AnsweredQuestionIDs(ctx context.Context, attemptID string) (map[string]bool, error) {
	rows, err := r.db.Query(ctx, `SELECT question_id FROM attempt_answers WHERE attempt_id = $1`, attemptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	answered := map[string]bool{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		answered[id] = true
	}
	return answered, rows.Err()
}

// AnswerRow صف إجابة محفوظ (يُستخدم عند حساب النتيجة).
type AnswerRow struct {
	QuestionID string
	IsCorrect  bool
	SkillIDs   []string
}

func (r *AttemptRepository) LoadAnswers(ctx context.Context, attemptID string) ([]AnswerRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT aa.question_id, COALESCE(aa.is_correct, false),
		       COALESCE(array_agg(qs.skill_id) FILTER (WHERE qs.skill_id IS NOT NULL), '{}')
		FROM attempt_answers aa
		LEFT JOIN question_skills qs ON qs.question_id = aa.question_id
		WHERE aa.attempt_id = $1
		GROUP BY aa.question_id, aa.is_correct
	`, attemptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var answers []AnswerRow
	for rows.Next() {
		var a AnswerRow
		if err := rows.Scan(&a.QuestionID, &a.IsCorrect, &a.SkillIDs); err != nil {
			return nil, err
		}
		answers = append(answers, a)
	}
	return answers, rows.Err()
}

// MarkSubmitted يقفل المحاولة. يعيد ErrAttemptFinished إن كانت مقفلة أصلًا
// (منع إرسال إجابات/تسليم بعد الإنهاء — docs/security-requirements.md).
func (r *AttemptRepository) MarkSubmitted(ctx context.Context, attemptID string) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE attempts SET status = 'submitted', submitted_at = now()
		WHERE id = $1 AND status = 'in_progress'
	`, attemptID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrAttemptFinished
	}
	_, _ = r.db.Exec(ctx, `
		INSERT INTO attempt_events (attempt_id, event_type) VALUES ($1, 'submitted')
	`, attemptID)
	return nil
}

func (r *AttemptRepository) SaveResult(ctx context.Context, result *models.AttemptResult) error {
	breakdown, err := json.Marshal(result.SkillBreakdown)
	if err != nil {
		return err
	}
	_, err = r.db.Exec(ctx, `
		INSERT INTO attempt_results (attempt_id, score, correct_count, total_count, skill_breakdown)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (attempt_id) DO NOTHING
	`, result.AttemptID, result.Score, result.CorrectCount, result.TotalCount, breakdown)
	return err
}

func (r *AttemptRepository) GetResult(ctx context.Context, attemptID string) (*models.AttemptResult, error) {
	var result models.AttemptResult
	var breakdown []byte
	err := r.db.QueryRow(ctx, `
		SELECT attempt_id, score, correct_count, total_count, skill_breakdown
		FROM attempt_results WHERE attempt_id = $1
	`, attemptID).Scan(&result.AttemptID, &result.Score, &result.CorrectCount, &result.TotalCount, &breakdown)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if err := json.Unmarshal(breakdown, &result.SkillBreakdown); err != nil {
		return nil, err
	}
	return &result, nil
}
