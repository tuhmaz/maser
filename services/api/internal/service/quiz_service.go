package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/models"
	"github.com/alemedu/api/internal/repository"
)

var ErrNoQuestions = errors.New("no published questions available")
var ErrQuestionNotInAttempt = errors.New("question does not belong to attempt")
var ErrAttemptNotInProgress = errors.New("attempt is not in progress")

const diagnosticQuestionLimit = 10

// QuizService ينفّذ دورة الاختبار الكاملة (docs/daily-plan-rules.md):
// إنشاء محاولة → حفظ إجابات فورًا → تسليم → حساب نتيجة داخل الخادم →
// تحديث المهارات → إنشاء أخطاء للمراجعة.
type QuizService struct {
	db           *pgxpool.Pool
	questions    *repository.QuestionRepository
	attempts     *repository.AttemptRepository
	learning     *repository.LearningRepository
	achievements *AchievementService
}

func NewQuizService(db *pgxpool.Pool, questions *repository.QuestionRepository, attempts *repository.AttemptRepository, learning *repository.LearningRepository, achievements *AchievementService) *QuizService {
	return &QuizService{db: db, questions: questions, attempts: attempts, learning: learning, achievements: achievements}
}

// AttemptView ما يُرسَل للطالب: المحاولة + أسئلتها منقّاة من الإجابات الصحيحة.
type AttemptView struct {
	Attempt   *models.Attempt            `json:"attempt"`
	Questions []models.SanitizedQuestion `json:"questions"`
}

// StartDiagnostic يبدأ اختبارًا تشخيصيًا لمادة الطالب المسجلة.
func (s *QuizService) StartDiagnostic(ctx context.Context, userID string) (*AttemptView, error) {
	var subjectID string
	err := s.db.QueryRow(ctx, `
		SELECT subject_id FROM student_subjects WHERE user_id = $1 LIMIT 1
	`, userID).Scan(&subjectID)
	if err != nil {
		return nil, fmt.Errorf("أكمل تهيئة الحساب (اختيار الصف والمادة) أولًا: %w", repository.ErrNotFound)
	}

	questions, err := s.questions.ForDiagnostic(ctx, subjectID, diagnosticQuestionLimit)
	if err != nil {
		return nil, err
	}
	if len(questions) == 0 {
		return nil, ErrNoQuestions
	}

	return s.createAttempt(ctx, userID, nil, "diagnostic", questions)
}

// StartQuiz يبدأ اختبارًا معرَّفًا مسبقًا (درس/وحدة/مراجعة).
func (s *QuizService) StartQuiz(ctx context.Context, userID, quizID string) (*AttemptView, error) {
	quiz, err := s.questions.GetQuiz(ctx, quizID)
	if err != nil {
		return nil, err
	}
	questions, err := s.questions.ForQuiz(ctx, quizID)
	if err != nil {
		return nil, err
	}
	if len(questions) == 0 {
		return nil, ErrNoQuestions
	}
	return s.createAttempt(ctx, userID, &quiz.ID, quiz.Type, questions)
}

// StartAdHocAttempt يبدأ محاولة على مجموعة أسئلة مختارة مسبقًا دون اختبار مُعرَّف
// (quiz row) — تستخدمها المهمة اليومية لأسئلتها الجديدة واختبار التثبيت
// (docs/daily-plan-rules.md). الأسئلة غير المنشورة أو المحذوفة تُتجاهَل بصمت.
func (s *QuizService) StartAdHocAttempt(ctx context.Context, userID, attemptType string, questionIDs []string) (*AttemptView, error) {
	byID, err := s.questions.ByIDs(ctx, questionIDs)
	if err != nil {
		return nil, err
	}
	questions := make([]models.FullQuestion, 0, len(questionIDs))
	for _, id := range questionIDs {
		if q, ok := byID[id]; ok {
			questions = append(questions, q)
		}
	}
	if len(questions) == 0 {
		return nil, ErrNoQuestions
	}
	return s.createAttempt(ctx, userID, nil, attemptType, questions)
}

func (s *QuizService) createAttempt(ctx context.Context, userID string, quizID *string, attemptType string, questions []models.FullQuestion) (*AttemptView, error) {
	order := make([]string, len(questions))
	for i, q := range questions {
		order[i] = q.ID
	}

	attempt, err := s.attempts.Create(ctx, userID, quizID, attemptType, order)
	if err != nil {
		return nil, err
	}

	sanitized := make([]models.SanitizedQuestion, len(questions))
	for i, q := range questions {
		sanitized[i] = q.Sanitized(false)
	}
	return &AttemptView{Attempt: attempt, Questions: sanitized}, nil
}

// GetAttempt يعيد المحاولة بأسئلتها المنقّاة وحالة "أجيب/لم يُجب" لكل سؤال —
// يسمح للطالب بالعودة بعد انقطاع الاتصال واستئناف الحل من حيث توقف.
func (s *QuizService) GetAttempt(ctx context.Context, userID, attemptID string) (*AttemptView, error) {
	attempt, err := s.attempts.GetForUser(ctx, attemptID, userID)
	if err != nil {
		return nil, err
	}

	byID, err := s.questions.ByIDs(ctx, attempt.QuestionOrder)
	if err != nil {
		return nil, err
	}
	answered, err := s.attempts.AnsweredQuestionIDs(ctx, attemptID)
	if err != nil {
		return nil, err
	}

	sanitized := make([]models.SanitizedQuestion, 0, len(attempt.QuestionOrder))
	for _, qid := range attempt.QuestionOrder {
		if q, ok := byID[qid]; ok {
			sanitized = append(sanitized, q.Sanitized(answered[qid]))
		}
	}
	return &AttemptView{Attempt: attempt, Questions: sanitized}, nil
}

// SaveAnswer يصحّح الإجابة داخل الخادم ويحفظها فورًا، دون كشف صحتها للطالب
// قبل التسليم (docs/daily-plan-rules.md: لا تُرسل الإجابة الصحيحة قبل تسليم السؤال).
func (s *QuizService) SaveAnswer(ctx context.Context, userID, attemptID, questionID string, answer json.RawMessage, timeSpentMs *int) error {
	attempt, err := s.attempts.GetForUser(ctx, attemptID, userID)
	if err != nil {
		return err
	}
	if attempt.Status != "in_progress" {
		return ErrAttemptNotInProgress
	}

	inAttempt := false
	for _, qid := range attempt.QuestionOrder {
		if qid == questionID {
			inAttempt = true
			break
		}
	}
	if !inAttempt {
		return ErrQuestionNotInAttempt
	}

	byID, err := s.questions.ByIDs(ctx, []string{questionID})
	if err != nil {
		return err
	}
	q, ok := byID[questionID]
	if !ok {
		return repository.ErrNotFound
	}

	isCorrect, err := Grade(&q, answer)
	if err != nil {
		return err
	}

	return s.attempts.SaveAnswer(ctx, attemptID, &q, answer, isCorrect, timeSpentMs)
}

// Submit يقفل المحاولة، يحسب النتيجة، يحدّث المهارات، ينشئ أخطاء المراجعة،
// ويحدّث سلسلة الأيام — كل ذلك داخل الخادم.
func (s *QuizService) Submit(ctx context.Context, userID, attemptID string) (*models.AttemptResult, error) {
	attempt, err := s.attempts.GetForUser(ctx, attemptID, userID)
	if err != nil {
		return nil, err
	}

	if err := s.attempts.MarkSubmitted(ctx, attemptID); err != nil {
		if errors.Is(err, repository.ErrAttemptFinished) {
			// تسليم مكرر: أعد النتيجة المحفوظة نفسها (idempotency)
			return s.attempts.GetResult(ctx, attemptID)
		}
		return nil, err
	}

	answers, err := s.attempts.LoadAnswers(ctx, attemptID)
	if err != nil {
		return nil, err
	}

	correctCount := 0
	type skillAgg struct{ correct, total int }
	perSkill := map[string]*skillAgg{}
	for _, a := range answers {
		if a.IsCorrect {
			correctCount++
		}
		for _, skillID := range a.SkillIDs {
			agg, ok := perSkill[skillID]
			if !ok {
				agg = &skillAgg{}
				perSkill[skillID] = agg
			}
			agg.total++
			if a.IsCorrect {
				agg.correct++
			}
		}
	}

	totalCount := len(attempt.QuestionOrder) // الأسئلة غير المجابة تُحسب ضمن الإجمالي
	score := 0.0
	if totalCount > 0 {
		score = float64(correctCount) / float64(totalCount) * 100
	}

	skillIDs := make([]string, 0, len(perSkill))
	for id := range perSkill {
		skillIDs = append(skillIDs, id)
	}
	sort.Strings(skillIDs) // ترتيب ثابت للتقرير
	names, err := s.learning.SkillNames(ctx, skillIDs)
	if err != nil {
		return nil, err
	}

	breakdown := make([]models.SkillResult, 0, len(skillIDs))
	for _, skillID := range skillIDs {
		agg := perSkill[skillID]
		state, reason, err := s.learning.RecordSkillOutcome(ctx, userID, skillID, agg.correct, agg.total-agg.correct)
		if err != nil {
			return nil, err
		}
		breakdown = append(breakdown, models.SkillResult{
			SkillID:   skillID,
			SkillName: names[skillID],
			Correct:   agg.correct,
			Total:     agg.total,
			NewState:  state,
			Reason:    reason,
		})
	}

	// دفتر الأخطاء: كل إجابة خاطئة تتحول لعنصر مراجعة مجدول
	if err := s.recordMistakes(ctx, userID, attemptID); err != nil {
		return nil, err
	}

	// الإنجازات (docs/daily-plan-rules.md §نظام الإنجازات): المنح آمن للاستدعاء المتكرر
	if streak, err := s.learning.TouchStreak(ctx, userID); err == nil {
		s.achievements.CheckStreak(ctx, userID, streak)
	}
	_, _ = s.achievements.Award(ctx, userID, "first_quiz")
	for _, sr := range breakdown {
		if sr.NewState == "mastered" {
			_, _ = s.achievements.Award(ctx, userID, "first_skill_mastered")
			break
		}
	}

	result := &models.AttemptResult{
		AttemptID:      attemptID,
		Score:          score,
		CorrectCount:   correctCount,
		TotalCount:     totalCount,
		SkillBreakdown: breakdown,
	}
	if err := s.attempts.SaveResult(ctx, result); err != nil {
		return nil, err
	}
	return result, nil
}

func (s *QuizService) recordMistakes(ctx context.Context, userID, attemptID string) error {
	rows, err := s.db.Query(ctx, `
		SELECT aa.id, aa.question_id, qs.skill_id
		FROM attempt_answers aa
		JOIN question_skills qs ON qs.question_id = aa.question_id
		WHERE aa.attempt_id = $1 AND aa.is_correct = false
	`, attemptID)
	if err != nil {
		return err
	}
	defer rows.Close()

	type mistake struct{ answerID, questionID, skillID string }
	var mistakes []mistake
	for rows.Next() {
		var m mistake
		if err := rows.Scan(&m.answerID, &m.questionID, &m.skillID); err != nil {
			return err
		}
		mistakes = append(mistakes, m)
	}
	if rows.Err() != nil {
		return rows.Err()
	}

	seen := map[string]bool{} // سؤال واحد = خطأ واحد حتى لو ارتبط بعدة مهارات
	for _, m := range mistakes {
		if seen[m.questionID] {
			continue
		}
		seen[m.questionID] = true
		if err := s.learning.RecordMistake(ctx, userID, m.questionID, m.skillID, m.answerID); err != nil {
			return err
		}
	}
	return nil
}

// GetResult يعيد نتيجة محاولة مسلَّمة لمالكها فقط.
func (s *QuizService) GetResult(ctx context.Context, userID, attemptID string) (*models.AttemptResult, error) {
	if _, err := s.attempts.GetForUser(ctx, attemptID, userID); err != nil {
		return nil, err
	}
	return s.attempts.GetResult(ctx, attemptID)
}
