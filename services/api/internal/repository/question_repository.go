package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/models"
)

type QuestionRepository struct {
	db *pgxpool.Pool
}

func NewQuestionRepository(db *pgxpool.Pool) *QuestionRepository {
	return &QuestionRepository{db: db}
}

// loadQuestions يحمّل الأسئلة المنشورة كاملة (بالإجابات الصحيحة) حسب شرط SQL معطى.
// النتيجة للاستخدام الداخلي فقط — لا تُرسَل للطالب إلا عبر Sanitized().
func (r *QuestionRepository) loadQuestions(ctx context.Context, where string, args ...any) ([]models.FullQuestion, error) {
	query := `
		SELECT q.id, qv.id, q.question_type, qv.body, COALESCE(qv.explanation, '')
		FROM questions q
		JOIN question_versions qv
		  ON qv.question_id = q.id AND qv.version_number = q.current_version
		WHERE q.status = 'published' AND ` + where

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var questions []models.FullQuestion
	for rows.Next() {
		var q models.FullQuestion
		if err := rows.Scan(&q.ID, &q.VersionID, &q.Type, &q.Body, &q.Explanation); err != nil {
			return nil, err
		}
		questions = append(questions, q)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}

	for i := range questions {
		if err := r.hydrateQuestion(ctx, &questions[i]); err != nil {
			return nil, err
		}
	}
	return questions, nil
}

func (r *QuestionRepository) hydrateQuestion(ctx context.Context, q *models.FullQuestion) error {
	optRows, err := r.db.Query(ctx, `
		SELECT id, text, "order", is_correct, COALESCE(wrong_reason, '')
		FROM question_options WHERE question_version_id = $1 ORDER BY "order"
	`, q.VersionID)
	if err != nil {
		return err
	}
	defer optRows.Close()
	for optRows.Next() {
		var o models.QuestionOption
		if err := optRows.Scan(&o.ID, &o.Text, &o.Order, &o.IsCorrect, &o.WrongReason); err != nil {
			return err
		}
		q.Options = append(q.Options, o)
	}
	if optRows.Err() != nil {
		return optRows.Err()
	}

	var value *string
	var tolerance *float64
	err = r.db.QueryRow(ctx, `
		SELECT answer_value, tolerance FROM question_answers
		WHERE question_version_id = $1 LIMIT 1
	`, q.VersionID).Scan(&value, &tolerance)
	if err == nil {
		q.NumericValue = value
		q.Tolerance = tolerance
	} // لا مشكلة إن لم توجد إجابة عددية (أسئلة الخيارات)

	skillRows, err := r.db.Query(ctx, `
		SELECT skill_id FROM question_skills WHERE question_id = $1
	`, q.ID)
	if err != nil {
		return err
	}
	defer skillRows.Close()
	for skillRows.Next() {
		var id string
		if err := skillRows.Scan(&id); err != nil {
			return err
		}
		q.SkillIDs = append(q.SkillIDs, id)
	}
	return skillRows.Err()
}

// ForDiagnostic يختار أسئلة منشورة موزعة على مهارات المادة للاختبار التشخيصي
// (docs/mastery-model.md: عدد محدود حتى لا ينسحب الطالب).
func (r *QuestionRepository) ForDiagnostic(ctx context.Context, subjectID string, limit int) ([]models.FullQuestion, error) {
	return r.loadQuestions(ctx, `
		q.subject_id = $1
		ORDER BY q.difficulty, q.created_at
		LIMIT $2
	`, subjectID, limit)
}

// ForQuiz يحمّل أسئلة اختبار معرَّف مسبقًا بترتيبها المحفوظ.
func (r *QuestionRepository) ForQuiz(ctx context.Context, quizID string) ([]models.FullQuestion, error) {
	return r.loadQuestions(ctx, `
		q.id IN (SELECT question_id FROM quiz_questions WHERE quiz_id = $1)
		ORDER BY (SELECT qq."order" FROM quiz_questions qq WHERE qq.quiz_id = $1 AND qq.question_id = q.id)
	`, quizID)
}

// ByIDs يحمّل أسئلة محددة (لاستئناف محاولة قائمة بترتيبها المحفوظ).
func (r *QuestionRepository) ByIDs(ctx context.Context, ids []string) (map[string]models.FullQuestion, error) {
	if len(ids) == 0 {
		return map[string]models.FullQuestion{}, nil
	}
	questions, err := r.loadQuestions(ctx, `q.id = ANY($1)`, ids)
	if err != nil {
		return nil, err
	}
	byID := make(map[string]models.FullQuestion, len(questions))
	for _, q := range questions {
		byID[q.ID] = q
	}
	return byID, nil
}

// QuizInfo معلومات اختبار معرَّف مسبقًا.
type QuizInfo struct {
	ID       string
	Type     string
	LessonID *string
	Title    string
}

func (r *QuestionRepository) GetQuiz(ctx context.Context, quizID string) (*QuizInfo, error) {
	var info QuizInfo
	err := r.db.QueryRow(ctx, `
		SELECT id, quiz_type, lesson_id, title FROM quizzes WHERE id = $1 AND is_active = true
	`, quizID).Scan(&info.ID, &info.Type, &info.LessonID, &info.Title)
	if err != nil {
		return nil, ErrNotFound
	}
	return &info, nil
}
