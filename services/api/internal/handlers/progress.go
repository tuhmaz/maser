package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/middleware"
	"github.com/alemedu/api/internal/utils"
)

type ProgressHandler struct {
	db *pgxpool.Pool
}

func NewProgressHandler(db *pgxpool.Pool) *ProgressHandler {
	return &ProgressHandler{db: db}
}

// Overview يعيد لوحة التقدم العامة (docs/daily-plan-rules.md: عناصر لوحة التقدم).
func (h *ProgressHandler) Overview(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	ctx := c.Context()

	var mastered, needsReview, totalSkills int
	_ = h.db.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE state = 'mastered'),
			COUNT(*) FILTER (WHERE state = 'needs_review'),
			COUNT(*)
		FROM student_skill_mastery WHERE user_id = $1
	`, userID).Scan(&mastered, &needsReview, &totalSkills)

	var questionsAnswered int
	_ = h.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM attempt_answers aa
		JOIN attempts a ON a.id = aa.attempt_id
		WHERE a.user_id = $1
	`, userID).Scan(&questionsAnswered)

	var currentStreak, longestStreak int
	_ = h.db.QueryRow(ctx, `
		SELECT current_streak, longest_streak FROM student_streaks WHERE user_id = $1
	`, userID).Scan(&currentStreak, &longestStreak)

	var lastScore *float64
	_ = h.db.QueryRow(ctx, `
		SELECT ar.score FROM attempt_results ar
		JOIN attempts a ON a.id = ar.attempt_id
		WHERE a.user_id = $1
		ORDER BY ar.computed_at DESC LIMIT 1
	`, userID).Scan(&lastScore)

	var dueMistakes int
	_ = h.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM review_schedules rs
		JOIN student_mistakes sm ON sm.id = rs.mistake_id
		WHERE sm.user_id = $1 AND rs.completed_at IS NULL AND rs.due_at <= now()
	`, userID).Scan(&dueMistakes)

	return c.JSON(fiber.Map{
		"skills": fiber.Map{
			"total":       totalSkills,
			"mastered":    mastered,
			"needsReview": needsReview,
		},
		"questionsAnswered": questionsAnswered,
		"streak": fiber.Map{
			"current": currentStreak,
			"longest": longestStreak,
		},
		"lastQuizScore":     lastScore,
		"mistakesDueNow":    dueMistakes,
	})
}

// Skills يعيد حالة كل مهارة مع التفسير النصي المحفوظ
// (شرط قبول docs/mastery-model.md: لا رقم غامض دون تفسير).
func (h *ProgressHandler) Skills(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)

	rows, err := h.db.Query(c.Context(), `
		SELECT sk.id, sk.name, m.state, COALESCE(m.last_state_reason, ''),
		       m.questions_seen, m.correct_count
		FROM student_skill_mastery m
		JOIN skills sk ON sk.id = m.skill_id
		WHERE m.user_id = $1
		ORDER BY sk.name
	`, userID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب المهارات")
	}
	defer rows.Close()

	type skillProgress struct {
		SkillID       string `json:"skillId"`
		Name          string `json:"name"`
		State         string `json:"state"`
		Reason        string `json:"reason"`
		QuestionsSeen int    `json:"questionsSeen"`
		CorrectCount  int    `json:"correctCount"`
	}
	skills := []skillProgress{}
	for rows.Next() {
		var s skillProgress
		if err := rows.Scan(&s.SkillID, &s.Name, &s.State, &s.Reason, &s.QuestionsSeen, &s.CorrectCount); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة المهارات")
		}
		skills = append(skills, s)
	}
	return c.JSON(skills)
}

// Skill يعيد مهارة واحدة بالتفصيل.
func (h *ProgressHandler) Skill(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	skillID := c.Params("skillId")

	var name, state, reason string
	var seen, correct, incorrect int
	err := h.db.QueryRow(c.Context(), `
		SELECT sk.name, m.state, COALESCE(m.last_state_reason, ''),
		       m.questions_seen, m.correct_count, m.incorrect_count
		FROM student_skill_mastery m
		JOIN skills sk ON sk.id = m.skill_id
		WHERE m.user_id = $1 AND m.skill_id = $2
	`, userID, skillID).Scan(&name, &state, &reason, &seen, &correct, &incorrect)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "لا توجد بيانات لهذه المهارة بعد")
	}

	return c.JSON(fiber.Map{
		"skillId":        skillID,
		"name":           name,
		"state":          state,
		"reason":         reason,
		"questionsSeen":  seen,
		"correctCount":   correct,
		"incorrectCount": incorrect,
	})
}
