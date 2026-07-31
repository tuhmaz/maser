package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"

	"github.com/jackc/pgx/v5"
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

	return s.createAttempt(ctx, userID, nil, "diagnostic", questions, nil)
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
	return s.createAttempt(ctx, userID, &quiz.ID, quiz.Type, questions, nil)
}

// StartAdHocAttempt يبدأ محاولة على مجموعة أسئلة مختارة مسبقًا دون اختبار مُعرَّف
// (quiz row) — تستخدمها المهمة اليومية لأسئلتها الجديدة واختبار التثبيت
// (docs/daily-plan-rules.md). الأسئلة غير المنشورة أو المحذوفة تُتجاهَل بصمت.
// dailyTaskID غير nil عند استدعائها من مهمة يومية — يربط المحاولة بالمهمة
// لاستئنافها لاحقًا وإكمال المهمة تلقائيًا عند التسليم.
func (s *QuizService) StartAdHocAttempt(ctx context.Context, userID, attemptType string, questionIDs []string, dailyTaskID *string) (*AttemptView, error) {
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
	return s.createAttempt(ctx, userID, nil, attemptType, questions, dailyTaskID)
}

func (s *QuizService) createAttempt(ctx context.Context, userID string, quizID *string, attemptType string, questions []models.FullQuestion, dailyTaskID *string) (*AttemptView, error) {
	order := make([]string, len(questions))
	for i, q := range questions {
		order[i] = q.ID
	}

	attempt, err := s.attempts.Create(ctx, userID, quizID, attemptType, order, dailyTaskID)
	if err != nil {
		return nil, err
	}
	// تجميد نسخة كل سؤال الآن — أي تعديل/نشر لاحق للسؤال لن يمس هذه المحاولة.
	if err := s.attempts.CreateQuestionVersions(ctx, attempt.ID, questions); err != nil {
		return nil, err
	}

	sanitized := make([]models.SanitizedQuestion, len(questions))
	for i, q := range questions {
		sanitized[i] = q.Sanitized(false)
	}
	return &AttemptView{Attempt: attempt, Questions: sanitized}, nil
}

// loadFrozenQuestions يحمّل أسئلة المحاولة بالنسخة المجمَّدة عند بدئها (وليس
// أي تعديل لاحق). محاولات قديمة بلا صفوف attempt_questions (قبل هذا الإصلاح)
// ترجع احتياطيًا للنسخة المنشورة الحالية حتى لا تنكسر.
func (s *QuizService) loadFrozenQuestions(ctx context.Context, attemptID string, questionIDs []string) (map[string]models.FullQuestion, error) {
	versionByQuestion, err := s.attempts.QuestionVersionIDs(ctx, attemptID)
	if err != nil {
		return nil, err
	}

	versionIDs := make([]string, 0, len(questionIDs))
	var missing []string
	for _, qid := range questionIDs {
		if vid, ok := versionByQuestion[qid]; ok {
			versionIDs = append(versionIDs, vid)
		} else {
			missing = append(missing, qid)
		}
	}

	result, err := s.questions.ByVersionIDs(ctx, versionIDs)
	if err != nil {
		return nil, err
	}
	if len(missing) > 0 {
		fallback, err := s.questions.ByIDs(ctx, missing)
		if err != nil {
			return nil, err
		}
		for id, q := range fallback {
			result[id] = q
		}
	}
	return result, nil
}

// AttemptForDailyTask يبحث عن محاولة قائمة (in_progress) بدأت من مهمة يومية
// محددة — يسمح لطبقة الخطة اليومية باستئناف نفس المحاولة بدل تكرارها.
func (s *QuizService) AttemptForDailyTask(ctx context.Context, userID, dailyTaskID string) (*models.Attempt, error) {
	return s.attempts.FindInProgressByDailyTask(ctx, userID, dailyTaskID)
}

// GetAttempt يعيد المحاولة بأسئلتها المنقّاة وحالة "أجيب/لم يُجب" لكل سؤال —
// يسمح للطالب بالعودة بعد انقطاع الاتصال واستئناف الحل من حيث توقف.
func (s *QuizService) GetAttempt(ctx context.Context, userID, attemptID string) (*AttemptView, error) {
	attempt, err := s.attempts.GetForUser(ctx, attemptID, userID)
	if err != nil {
		return nil, err
	}

	byID, err := s.loadFrozenQuestions(ctx, attemptID, attempt.QuestionOrder)
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

	byID, err := s.loadFrozenQuestions(ctx, attemptID, []string{questionID})
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
//
// كل الخطوات من قفل المحاولة حتى حفظ النتيجة تُنفَّذ داخل معاملة واحدة: فشل
// أي خطوة (مثلًا انقطاع الاتصال بعد التصحيح وقبل الحفظ) يُلغي كل شيء، فلا
// تبقى محاولة "submitted" بلا نتيجة يستحيل استرجاعها لاحقًا. القفل الصفّي
// على تحديث حالة المحاولة (MarkSubmitted) يمنع أيضًا تنفيذ طلبي تسليم
// متزامنين لنفس المحاولة مرتين.
func (s *QuizService) Submit(ctx context.Context, userID, attemptID string) (*models.AttemptResult, error) {
	attempt, err := s.attempts.GetForUser(ctx, attemptID, userID)
	if err != nil {
		return nil, err
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx) // لا تأثير له بعد Commit ناجح

	attemptsTx := s.attempts.WithTx(tx)
	learningTx := s.learning.WithTx(tx)

	if err := attemptsTx.MarkSubmitted(ctx, attemptID); err != nil {
		if errors.Is(err, repository.ErrAttemptFinished) {
			// تسليم مكرر أو متزامن: النتيجة محفوظة أصلًا من التسليم الأول
			// (idempotency) — تُقرأ خارج هذه المعاملة الفارغة.
			return s.attempts.GetResult(ctx, attemptID)
		}
		return nil, err
	}

	// الأسئلة التي لم يُجب عنها الطالب إطلاقًا كانت تُستبعَد بالكامل من حساب
	// الإتقان ودفتر الأخطاء (كأنها لم تُعرَض عليه أصلًا). نسجّلها الآن صراحةً
	// كإجابات خاطئة قبل التصحيح، فتدخل في كل الحسابات التالية تلقائيًا
	// (docs/mastery-model.md: السؤال المتروك يجب أن يُضعف تقدير الإتقان).
	allQuestions, err := s.loadFrozenQuestions(ctx, attemptID, attempt.QuestionOrder)
	if err != nil {
		return nil, err
	}
	answeredIDs, err := attemptsTx.AnsweredQuestionIDs(ctx, attemptID)
	if err != nil {
		return nil, err
	}
	for _, qid := range attempt.QuestionOrder {
		if answeredIDs[qid] {
			continue
		}
		if q, ok := allQuestions[qid]; ok {
			if err := attemptsTx.SaveAnswer(ctx, attemptID, &q, json.RawMessage("null"), false, nil); err != nil {
				return nil, err
			}
		}
	}

	answers, err := attemptsTx.LoadAnswers(ctx, attemptID)
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

	totalCount := len(attempt.QuestionOrder)
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
		state, reason, err := learningTx.RecordSkillOutcome(ctx, userID, skillID, agg.correct, agg.total-agg.correct)
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

	// دفتر الأخطاء: كل إجابة خاطئة (بما فيها الأسئلة المتروكة أعلاه) تتحول لعنصر مراجعة مجدول
	if err := s.recordMistakes(ctx, tx, learningTx, userID, attemptID); err != nil {
		return nil, err
	}

	result := &models.AttemptResult{
		AttemptID:      attemptID,
		Score:          score,
		CorrectCount:   correctCount,
		TotalCount:     totalCount,
		SkillBreakdown: breakdown,
	}
	if err := attemptsTx.SaveResult(ctx, result); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	// إن كانت هذه المحاولة بدأت من مهمة يومية (StartAdHocAttempt عبر daily-plan)،
	// أكمل المهمة تلقائيًا الآن — الطالب لم يعد يحتاج طلب /complete منفصل بعد
	// التسليم (كان يمكن نسيانه من الواجهة فتبقى المهمة "قيد التنفيذ" أبدًا).
	if attempt.DailyTaskID != nil {
		_ = s.completeLinkedDailyTask(ctx, *attempt.DailyTaskID)
	}

	// الإنجازات وسلسلة الأيام: تُنفَّذ بعد نجاح الالتزام فقط، بأثر جانبي آمن
	// للاستدعاء المتكرر (docs/daily-plan-rules.md §نظام الإنجازات) — لا حاجة
	// لتضمينها في نفس المعاملة الحرجة أعلاه.
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

	return result, nil
}

// completeLinkedDailyTask يُكمل مهمة يومية مرتبطة بمحاولة سُلِّمت للتو —
// idempotent بفضل فهرس task_completions الفريد (ON CONFLICT DO NOTHING).
func (s *QuizService) completeLinkedDailyTask(ctx context.Context, dailyTaskID string) error {
	if _, err := s.db.Exec(ctx, `
		UPDATE daily_tasks SET status = 'completed' WHERE id = $1 AND status <> 'completed'
	`, dailyTaskID); err != nil {
		return err
	}
	_, err := s.db.Exec(ctx, `
		INSERT INTO task_completions (daily_task_id) VALUES ($1) ON CONFLICT (daily_task_id) DO NOTHING
	`, dailyTaskID)
	return err
}

func (s *QuizService) recordMistakes(ctx context.Context, tx pgx.Tx, learningTx *repository.LearningRepository, userID, attemptID string) error {
	rows, err := tx.Query(ctx, `
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
		if err := learningTx.RecordMistake(ctx, userID, m.questionID, m.skillID, m.answerID); err != nil {
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
