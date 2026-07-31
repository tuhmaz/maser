package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/repository"
)

var ErrNoSubject = errors.New("student has no subject selected")
var ErrTaskFinished = errors.New("daily task already completed")
var ErrTaskHasNoAttempt = errors.New("this task type does not start an attempt")

// DailyPlanService يبني المهمة اليومية وينفّذها — docs/daily-plan-rules.md:
// مراجعة قصيرة → شرح/تذكير → أسئلة جديدة → سؤال من دفتر الأخطاء → اختبار تثبيت.
// لا تتجاوز المهمة قدرة الطالب ولا تعتمد على أسئلة عشوائية فقط.
type DailyPlanService struct {
	db   *pgxpool.Pool
	quiz *QuizService
}

func NewDailyPlanService(db *pgxpool.Pool, quiz *QuizService) *DailyPlanService {
	return &DailyPlanService{db: db, quiz: quiz}
}

type DailyTaskView struct {
	ID      string          `json:"id"`
	Type    string          `json:"type"`
	Order   int             `json:"order"`
	Status  string          `json:"status"`
	Payload json.RawMessage `json:"payload"`
}

type DailyPlanView struct {
	ID               string          `json:"id"`
	Date             string          `json:"date"`
	Type             string          `json:"type"`
	EstimatedMinutes int             `json:"estimatedMinutes"`
	Tasks            []DailyTaskView `json:"tasks"`
}

// GetToday يعيد خطة اليوم إن وُجدت، أو nil إن لم تُولَّد بعد.
func (s *DailyPlanService) GetToday(ctx context.Context, userID string) (*DailyPlanView, error) {
	var planID string
	err := s.db.QueryRow(ctx, `
		SELECT id FROM daily_plans WHERE user_id = $1 AND plan_date = CURRENT_DATE
	`, userID).Scan(&planID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return s.loadPlan(ctx, planID)
}

// Generate يبني خطة اليوم إن لم تُوجَد بعد (عملية عديمة التأثير الجانبي المكرر —
// استدعاؤها أكثر من مرة في نفس اليوم يعيد نفس الخطة دون تكرارها).
func (s *DailyPlanService) Generate(ctx context.Context, userID string) (*DailyPlanView, error) {
	if existing, err := s.GetToday(ctx, userID); err != nil {
		return nil, err
	} else if existing != nil {
		return existing, nil
	}

	var subjectID string
	err := s.db.QueryRow(ctx, `SELECT subject_id FROM student_subjects WHERE user_id = $1 LIMIT 1`, userID).Scan(&subjectID)
	if err != nil {
		return nil, ErrNoSubject
	}

	// 1) مراجعة قصيرة: أخطاء مستحقة الآن (حد أقصى 5 حتى لا يُغرق الطالب)
	mistakeIDs, err := s.dueMistakeIDs(ctx, userID, 5)
	if err != nil {
		return nil, err
	}
	// لا يوجد شيء مستحق اليوم؟ أدرج أخطاء نشطة غير متقنة كحد أدنى (حد 3) بدل خطة فارغة
	if len(mistakeIDs) == 0 {
		mistakeIDs, err = s.activeMistakeIDs(ctx, userID, 3)
		if err != nil {
			return nil, err
		}
	}

	// 2) شرح/تذكير: أضعف مهارة حالية
	weakSkillID, weakSkillName, weakReason, err := s.weakestSkill(ctx, userID, subjectID)
	if err != nil {
		return nil, err
	}

	// 3) أسئلة جديدة: أسئلة منشورة لم يُجب عنها الطالب بعد
	newQuestionIDs, err := s.unseenQuestionIDs(ctx, userID, subjectID, 5)
	if err != nil {
		return nil, err
	}

	planType := "regular"
	if len(mistakeIDs) == 0 && weakSkillID == "" && len(newQuestionIDs) < 3 {
		planType = "short"
	}
	estimatedMinutes := len(mistakeIDs)*2 + len(newQuestionIDs)*2
	if weakSkillID != "" {
		estimatedMinutes += 3
	}
	if estimatedMinutes == 0 {
		estimatedMinutes = 5
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var planID string
	err = tx.QueryRow(ctx, `
		INSERT INTO daily_plans (user_id, plan_date, plan_type, estimated_minutes)
		VALUES ($1, CURRENT_DATE, $2, $3)
		RETURNING id
	`, userID, planType, estimatedMinutes).Scan(&planID)
	if err != nil {
		return nil, err
	}

	order := 1
	if weakSkillID != "" {
		payload, _ := json.Marshal(map[string]any{
			"skillId": weakSkillID, "skillName": weakSkillName, "reason": weakReason,
		})
		if err := s.insertTask(ctx, tx, planID, "explanation", order, payload); err != nil {
			return nil, err
		}
		order++
	}
	if len(mistakeIDs) > 0 {
		payload, _ := json.Marshal(map[string]any{"mistakeIds": mistakeIDs})
		if err := s.insertTask(ctx, tx, planID, "short_review", order, payload); err != nil {
			return nil, err
		}
		order++
	}
	if len(newQuestionIDs) > 0 {
		payload, _ := json.Marshal(map[string]any{"questionIds": newQuestionIDs})
		if err := s.insertTask(ctx, tx, planID, "new_questions", order, payload); err != nil {
			return nil, err
		}
		order++
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return s.loadPlan(ctx, planID)
}

func (s *DailyPlanService) insertTask(ctx context.Context, tx pgx.Tx, planID, taskType string, order int, payload json.RawMessage) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO daily_tasks (daily_plan_id, task_type, "order", payload)
		VALUES ($1, $2, $3, $4)
	`, planID, taskType, order, payload)
	return err
}

func (s *DailyPlanService) loadPlan(ctx context.Context, planID string) (*DailyPlanView, error) {
	var view DailyPlanView
	var date string
	err := s.db.QueryRow(ctx, `
		SELECT id, to_char(plan_date, 'YYYY-MM-DD'), plan_type, estimated_minutes
		FROM daily_plans WHERE id = $1
	`, planID).Scan(&view.ID, &date, &view.Type, &view.EstimatedMinutes)
	if err != nil {
		return nil, err
	}
	view.Date = date

	rows, err := s.db.Query(ctx, `
		SELECT id, task_type, "order", status, payload
		FROM daily_tasks WHERE daily_plan_id = $1 ORDER BY "order"
	`, planID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	view.Tasks = []DailyTaskView{}
	for rows.Next() {
		var t DailyTaskView
		if err := rows.Scan(&t.ID, &t.Type, &t.Order, &t.Status, &t.Payload); err != nil {
			return nil, err
		}
		view.Tasks = append(view.Tasks, t)
	}
	return &view, rows.Err()
}

// StartTaskResult ما تعيده بداية مهمة: إما محاولة اختبار يجب الانتقال إليها،
// أو إشارة "بلا اختبار" (مراجعة/شرح) يبقى التعامل معها في الواجهة.
type StartTaskResult struct {
	Kind    string       `json:"kind"` // "attempt" | "review" | "explanation"
	Attempt *AttemptView `json:"attempt,omitempty"`
}

// StartTask يبدأ مهمة، أو يستأنف محاولتها القائمة إن كانت مهمة اختبار بدأها
// الطالب سابقًا (إعادة الضغط لا تُنشئ محاولة مكرَّرة — راجع تقرير المراجعة
// §8.4/§8.5). حالة المهمة لا تتحوَّل إلى in_progress إلا بعد نجاح إنشاء/إيجاد
// المحاولة فعليًا، ولا يمكن "بدء" مهمة مكتملة أصلًا (كانت تُعاد إلى in_progress بصمت).
func (s *DailyPlanService) StartTask(ctx context.Context, userID, taskID string) (*StartTaskResult, error) {
	taskType, status, payload, err := s.getTask(ctx, userID, taskID)
	if err != nil {
		return nil, err
	}
	if status == "completed" {
		return nil, ErrTaskFinished
	}

	switch taskType {
	case "new_questions", "stabilization_test":
		if existing, err := s.quiz.AttemptForDailyTask(ctx, userID, taskID); err == nil {
			view, err := s.quiz.GetAttempt(ctx, userID, existing.ID)
			if err != nil {
				return nil, err
			}
			return &StartTaskResult{Kind: "attempt", Attempt: view}, nil
		} else if !errors.Is(err, repository.ErrNotFound) {
			return nil, err
		}

		var p struct {
			QuestionIDs []string `json:"questionIds"`
		}
		if err := json.Unmarshal(payload, &p); err != nil {
			return nil, fmt.Errorf("payload مهمة غير صالح: %w", err)
		}
		view, err := s.quiz.StartAdHocAttempt(ctx, userID, "daily", p.QuestionIDs, &taskID)
		if err != nil {
			return nil, err
		}
		if err := s.setTaskStatus(ctx, taskID, "in_progress"); err != nil {
			return nil, err
		}
		return &StartTaskResult{Kind: "attempt", Attempt: view}, nil

	case "short_review", "mistake_question":
		if err := s.setTaskStatus(ctx, taskID, "in_progress"); err != nil {
			return nil, err
		}
		return &StartTaskResult{Kind: "review"}, nil

	default: // explanation
		if err := s.setTaskStatus(ctx, taskID, "in_progress"); err != nil {
			return nil, err
		}
		return &StartTaskResult{Kind: "explanation"}, nil
	}
}

// CompleteTask يُستخدم لمهام بلا اختبار (مراجعة/شرح) — مهام الاختبار تُكمَل
// تلقائيًا عند التسليم (QuizService.completeLinkedDailyTask)، فاستدعاء هذا
// على مهمة أُكمِلت أصلًا آمن (idempotent) لا يخطئ.
func (s *DailyPlanService) CompleteTask(ctx context.Context, userID, taskID string) error {
	_, status, _, err := s.getTask(ctx, userID, taskID)
	if err != nil {
		return err
	}
	if status == "completed" {
		return nil
	}
	if err := s.setTaskStatus(ctx, taskID, "completed"); err != nil {
		return err
	}
	_, err = s.db.Exec(ctx, `
		INSERT INTO task_completions (daily_task_id) VALUES ($1) ON CONFLICT (daily_task_id) DO NOTHING
	`, taskID)
	return err
}

// getTask يتحقق أن المهمة تخص هذا الطالب (عبر daily_plans.user_id) ويعيدها
// للقراءة فقط — لا يغيّر حالتها (راجع setTaskStatus).
func (s *DailyPlanService) getTask(ctx context.Context, userID, taskID string) (taskType, status string, payload json.RawMessage, err error) {
	err = s.db.QueryRow(ctx, `
		SELECT dt.task_type, dt.status, dt.payload
		FROM daily_tasks dt
		JOIN daily_plans dp ON dp.id = dt.daily_plan_id
		WHERE dt.id = $1 AND dp.user_id = $2
	`, taskID, userID).Scan(&taskType, &status, &payload)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", "", nil, repository.ErrNotFound
		}
		return "", "", nil, err
	}
	return taskType, status, payload, nil
}

func (s *DailyPlanService) setTaskStatus(ctx context.Context, taskID, status string) error {
	_, err := s.db.Exec(ctx, `UPDATE daily_tasks SET status = $2 WHERE id = $1`, taskID, status)
	return err
}

// --- استعلامات بناء الخطة ---

func (s *DailyPlanService) dueMistakeIDs(ctx context.Context, userID string, limit int) ([]string, error) {
	return s.queryIDs(ctx, `
		SELECT sm.id FROM student_mistakes sm
		JOIN review_schedules rs ON rs.mistake_id = sm.id
		WHERE sm.user_id = $1 AND rs.completed_at IS NULL AND rs.due_at <= now()
		  AND sm.mastery_state <> 'mastered'
		ORDER BY rs.due_at LIMIT $2
	`, userID, limit)
}

func (s *DailyPlanService) activeMistakeIDs(ctx context.Context, userID string, limit int) ([]string, error) {
	return s.queryIDs(ctx, `
		SELECT id FROM student_mistakes
		WHERE user_id = $1 AND mastery_state <> 'mastered'
		ORDER BY last_seen_at DESC LIMIT $2
	`, userID, limit)
}

func (s *DailyPlanService) unseenQuestionIDs(ctx context.Context, userID, subjectID string, limit int) ([]string, error) {
	return s.queryIDs(ctx, `
		SELECT q.id FROM questions q
		WHERE q.subject_id = $1 AND q.status = 'published'
		  AND q.id NOT IN (
		    SELECT aa.question_id FROM attempt_answers aa
		    JOIN attempts a ON a.id = aa.attempt_id
		    WHERE a.user_id = $2
		  )
		ORDER BY q.difficulty, q.created_at LIMIT $3
	`, subjectID, userID, limit)
}

func (s *DailyPlanService) weakestSkill(ctx context.Context, userID, subjectID string) (id, name, reason string, err error) {
	err = s.db.QueryRow(ctx, `
		SELECT sk.id, sk.name, COALESCE(m.last_state_reason, '')
		FROM student_skill_mastery m
		JOIN skills sk ON sk.id = m.skill_id
		JOIN question_skills qs ON qs.skill_id = sk.id
		JOIN questions q ON q.id = qs.question_id AND q.subject_id = $2
		WHERE m.user_id = $1 AND m.state IN ('needs_review', 'practicing')
		GROUP BY sk.id, sk.name, m.last_state_reason, m.updated_at
		ORDER BY m.updated_at LIMIT 1
	`, userID, subjectID).Scan(&id, &name, &reason)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", "", "", nil
		}
		return "", "", "", err
	}
	return id, name, reason, nil
}

func (s *DailyPlanService) queryIDs(ctx context.Context, query string, args ...any) ([]string, error) {
	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ids := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}
