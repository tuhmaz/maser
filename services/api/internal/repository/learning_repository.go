package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// LearningRepository يدير إتقان المهارات ودفتر الأخطاء وجدولة المراجعة والسلاسل.
type LearningRepository struct {
	db Querier
}

func NewLearningRepository(db *pgxpool.Pool) *LearningRepository {
	return &LearningRepository{db: db}
}

// WithTx يعيد نسخة من المستودع تعمل داخل معاملة قائمة بدل المجمّع مباشرة.
func (r *LearningRepository) WithTx(tx pgx.Tx) *LearningRepository {
	return &LearningRepository{db: tx}
}

// MasteryState حالة إتقان محسوبة مع تفسيرها.
type MasteryState struct {
	SkillID       string  `json:"skillId"`
	SkillName     string  `json:"skillName"`
	State         string  `json:"state"`
	Reason        string  `json:"reason"`
	QuestionsSeen int     `json:"questionsSeen"`
	CorrectCount  int     `json:"correctCount"`
	Accuracy      float64 `json:"accuracy"`
}

// RecordSkillOutcome يحدّث عدّادات مهارة بعد محاولة ويعيد الحالة الجديدة مع تفسيرها.
//
// مبدأ الحساب (docs/mastery-model.md): لا يعتمد الإتقان على سؤال واحد؛
// تُراكَم المحاولات وتُحسب الدقة، ويُحفَظ تفسير نصي مفهوم لكل تصنيف.
func (r *LearningRepository) RecordSkillOutcome(ctx context.Context, userID, skillID string, correct, incorrect int) (state string, reason string, err error) {
	var seen, totalCorrect, totalIncorrect int
	err = r.db.QueryRow(ctx, `
		INSERT INTO student_skill_mastery (user_id, skill_id, questions_seen, correct_count, incorrect_count, last_answered_at, state)
		VALUES ($1, $2, $3, $4, $5, now(), 'introduced')
		ON CONFLICT (user_id, skill_id) DO UPDATE SET
			questions_seen = student_skill_mastery.questions_seen + EXCLUDED.questions_seen,
			correct_count = student_skill_mastery.correct_count + EXCLUDED.correct_count,
			incorrect_count = student_skill_mastery.incorrect_count + EXCLUDED.incorrect_count,
			last_answered_at = now(),
			updated_at = now()
		RETURNING questions_seen, correct_count, incorrect_count
	`, userID, skillID, correct+incorrect, correct, incorrect).Scan(&seen, &totalCorrect, &totalIncorrect)
	if err != nil {
		return "", "", err
	}

	state, reason = classifyMastery(seen, totalCorrect, totalIncorrect)

	_, err = r.db.Exec(ctx, `
		UPDATE student_skill_mastery SET state = $3, last_state_reason = $4
		WHERE user_id = $1 AND skill_id = $2
	`, userID, skillID, state, reason)
	return state, reason, err
}

// classifyMastery قواعد التصنيف الأولية. تُحسَّن لاحقًا بنافذة حداثة وتنوع صعوبة،
// لكن العقد ثابت: كل حالة تأتي مع تفسير نصي مفهوم.
func classifyMastery(seen, correct, incorrect int) (string, string) {
	if seen == 0 {
		return "not_started", "لم تُجب على أي سؤال في هذه المهارة بعد."
	}
	accuracy := float64(correct) / float64(seen)
	switch {
	case seen < 3:
		return "introduced", fmt.Sprintf("بدأت التدرب على هذه المهارة (%d من %d صحيحة). أكمل مزيدًا من الأسئلة لتقييم أدق.", correct, seen)
	case accuracy >= 0.9 && seen >= 5:
		return "mastered", fmt.Sprintf("أتقنت هذه المهارة: أجبت صحيحًا على %d من %d سؤالًا.", correct, seen)
	case accuracy >= 0.7:
		return "developing", fmt.Sprintf("تتطور جيدًا: %d إجابة صحيحة من %d. تحتاج مزيدًا من التثبيت.", correct, seen)
	case accuracy >= 0.4:
		return "practicing", fmt.Sprintf("ما زلت تتدرب: %d صحيحة من %d. راجع الدرس وحاول مجددًا.", correct, seen)
	default:
		return "needs_review", fmt.Sprintf("تحتاج إلى مراجعة هذه المهارة لأنك أخطأت في %d من %d سؤالًا.", incorrect, seen)
	}
}

// RecordMistake يسجّل خطأ في دفتر الأخطاء ويجدول مراجعته.
// الخطأ المتكرر يعود أسرع (docs/mastery-model.md: قواعد الجدولة).
func (r *LearningRepository) RecordMistake(ctx context.Context, userID, questionID, skillID, attemptAnswerID string) error {
	var mistakeID string
	var count int
	err := r.db.QueryRow(ctx, `
		INSERT INTO student_mistakes (user_id, question_id, skill_id, attempt_answer_id, mistake_count, mastery_state, last_seen_at)
		VALUES ($1, $2, $3, $4, 1, 'new', now())
		ON CONFLICT (user_id, question_id) DO UPDATE SET
			mistake_count = student_mistakes.mistake_count + 1,
			mastery_state = 'reviewing_soon',
			last_seen_at = now()
		RETURNING id, mistake_count
	`, userID, questionID, skillID, attemptAnswerID).Scan(&mistakeID, &count)
	if err != nil {
		return err
	}

	due := reviewDelay(count)
	_, err = r.db.Exec(ctx, `
		INSERT INTO review_schedules (mistake_id, due_at) VALUES ($1, now() + $2::interval)
	`, mistakeID, due.String())
	return err
}

// reviewDelay: أول خطأ → 24 ساعة، الثاني → 12، الثالث فأكثر → 4 (الخطأ المتكرر يعود أسرع).
func reviewDelay(mistakeCount int) time.Duration {
	switch {
	case mistakeCount <= 1:
		return 24 * time.Hour
	case mistakeCount == 2:
		return 12 * time.Hour
	default:
		return 4 * time.Hour
	}
}

// MistakeQuestionID يعيد معرّف السؤال المرتبط بخطأ (مع التحقق من الملكية) —
// يُستخدم لتحميل السؤال كاملًا وتصحيح إجابة المراجعة داخل الخادم.
func (r *LearningRepository) MistakeQuestionID(ctx context.Context, userID, mistakeID string) (string, error) {
	var questionID string
	err := r.db.QueryRow(ctx, `
		SELECT question_id FROM student_mistakes WHERE id = $1 AND user_id = $2
	`, mistakeID, userID).Scan(&questionID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNotFound
		}
		return "", err
	}
	return questionID, nil
}

// ReviewOutcome يسجّل نتيجة مراجعة خطأ ويعيد جدولته:
// نجاح متتالٍ يباعد المراجعة؛ فشل يقرّبها. الإجابة الصحيحة مرة واحدة لا تعني الإتقان.
func (r *LearningRepository) ReviewOutcome(ctx context.Context, userID, mistakeID string, correct bool) (newState string, err error) {
	var count int
	var state string
	err = r.db.QueryRow(ctx, `
		SELECT mistake_count, mastery_state FROM student_mistakes WHERE id = $1 AND user_id = $2
	`, mistakeID, userID).Scan(&count, &state)
	if err != nil {
		return "", ErrNotFound
	}

	// إقفال أي جدولة معلّقة لهذا الخطأ
	_, _ = r.db.Exec(ctx, `
		UPDATE review_schedules SET completed_at = now()
		WHERE mistake_id = $1 AND completed_at IS NULL
	`, mistakeID)

	var nextDelay time.Duration
	if correct {
		switch state {
		case "new", "reviewing_soon":
			newState, nextDelay = "reviewing_later", 3*24*time.Hour
		case "reviewing_later":
			newState, nextDelay = "stabilizing", 7*24*time.Hour
		default: // stabilizing → متقن، لا جدولة جديدة
			newState = "mastered"
		}
	} else {
		newState, nextDelay = "reviewing_soon", reviewDelay(count+1)
		_, _ = r.db.Exec(ctx, `
			UPDATE student_mistakes SET mistake_count = mistake_count + 1 WHERE id = $1
		`, mistakeID)
	}

	_, err = r.db.Exec(ctx, `
		UPDATE student_mistakes SET mastery_state = $2, last_seen_at = now() WHERE id = $1
	`, mistakeID, newState)
	if err != nil {
		return "", err
	}

	if newState != "mastered" {
		_, err = r.db.Exec(ctx, `
			INSERT INTO review_schedules (mistake_id, due_at) VALUES ($1, now() + $2::interval)
		`, mistakeID, nextDelay.String())
	}
	return newState, err
}

// TouchStreak يحدّث سلسلة الأيام المتواصلة عند أي نشاط تعلم.
// TouchStreak يعيد السلسلة الحالية بعد التحديث (تُستخدم لفحص إنجازات السلسلة).
func (r *LearningRepository) TouchStreak(ctx context.Context, userID string) (int, error) {
	var current int
	err := r.db.QueryRow(ctx, `
		INSERT INTO student_streaks (user_id, current_streak, longest_streak, last_activity_date)
		VALUES ($1, 1, 1, CURRENT_DATE)
		ON CONFLICT (user_id) DO UPDATE SET
			current_streak = CASE
				WHEN student_streaks.last_activity_date = CURRENT_DATE THEN student_streaks.current_streak
				WHEN student_streaks.last_activity_date = CURRENT_DATE - 1 THEN student_streaks.current_streak + 1
				ELSE 1
			END,
			longest_streak = GREATEST(student_streaks.longest_streak, CASE
				WHEN student_streaks.last_activity_date = CURRENT_DATE THEN student_streaks.current_streak
				WHEN student_streaks.last_activity_date = CURRENT_DATE - 1 THEN student_streaks.current_streak + 1
				ELSE 1
			END),
			last_activity_date = CURRENT_DATE,
			updated_at = now()
		RETURNING current_streak
	`, userID).Scan(&current)
	return current, err
}

// SkillNames أسماء مهارات حسب معرفاتها (لبناء تقارير مفهومة).
func (r *LearningRepository) SkillNames(ctx context.Context, ids []string) (map[string]string, error) {
	if len(ids) == 0 {
		return map[string]string{}, nil
	}
	rows, err := r.db.Query(ctx, `SELECT id, name FROM skills WHERE id = ANY($1)`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	names := map[string]string{}
	for rows.Next() {
		var id, name string
		if err := rows.Scan(&id, &name); err != nil {
			return nil, err
		}
		names[id] = name
	}
	return names, rows.Err()
}
