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
		"lastQuizScore":  lastScore,
		"mistakesDueNow": dueMistakes,
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

// Subject يعيد خريطة تقدم تفصيلية لمادة واحدة: كل وحداتها ودروسها مع حالة
// إتقان كل مهارة مرتبطة، ونسبة إكمال إجمالية للمادة (docs/daily-plan-rules.md:
// عناصر لوحة التقدم — "إكمال المادة" يُحتسب من المهارات وليس عدد الصفحات).
func (h *ProgressHandler) Subject(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	subjectID := c.Params("subjectId")
	ctx := c.Context()

	var subjectName string
	if err := h.db.QueryRow(ctx, `SELECT name FROM subjects WHERE id = $1`, subjectID).Scan(&subjectName); err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "المادة غير موجودة")
	}

	unitRows, err := h.db.Query(ctx, `
		SELECT id, name, "order" FROM units WHERE subject_id = $1 AND is_active = true ORDER BY "order"
	`, subjectID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب وحدات المادة")
	}
	defer unitRows.Close()

	type lessonProgress struct {
		LessonID string      `json:"lessonId"`
		Name     string      `json:"name"`
		Skills   []fiber.Map `json:"skills"`
	}
	type unitProgress struct {
		UnitID  string           `json:"unitId"`
		Name    string           `json:"name"`
		Lessons []lessonProgress `json:"lessons"`
	}

	units := []unitProgress{}
	totalSkills, masteredSkills := 0, 0

	for unitRows.Next() {
		var u unitProgress
		var unitID string
		if err := unitRows.Scan(&unitID, &u.Name, new(int)); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة الوحدات")
		}
		u.UnitID = unitID

		lessonRows, err := h.db.Query(ctx, `
			SELECT id, name FROM lessons WHERE unit_id = $1 AND is_active = true ORDER BY "order"
		`, unitID)
		if err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب دروس الوحدة")
		}
		for lessonRows.Next() {
			var l lessonProgress
			if err := lessonRows.Scan(&l.LessonID, &l.Name); err != nil {
				lessonRows.Close()
				return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة الدروس")
			}

			skillRows, err := h.db.Query(ctx, `
				SELECT sk.id, sk.name, COALESCE(m.state, 'not_started'), COALESCE(m.last_state_reason, '')
				FROM lesson_skills ls
				JOIN skills sk ON sk.id = ls.skill_id
				LEFT JOIN student_skill_mastery m ON m.skill_id = sk.id AND m.user_id = $2
				WHERE ls.lesson_id = $1
				ORDER BY sk.name
			`, l.LessonID, userID)
			if err != nil {
				lessonRows.Close()
				return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب مهارات الدرس")
			}
			for skillRows.Next() {
				var skillID, name, state, reason string
				if err := skillRows.Scan(&skillID, &name, &state, &reason); err != nil {
					skillRows.Close()
					lessonRows.Close()
					return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة المهارات")
				}
				l.Skills = append(l.Skills, fiber.Map{"skillId": skillID, "name": name, "state": state, "reason": reason})
				totalSkills++
				if state == "mastered" {
					masteredSkills++
				}
			}
			skillRows.Close()
			u.Lessons = append(u.Lessons, l)
		}
		lessonRows.Close()
		units = append(units, u)
	}

	completion := 0
	if totalSkills > 0 {
		completion = masteredSkills * 100 / totalSkills
	}

	return c.JSON(fiber.Map{
		"subjectId":         subjectID,
		"subjectName":       subjectName,
		"completionPercent": completion,
		"totalSkills":       totalSkills,
		"masteredSkills":    masteredSkills,
		"units":             units,
	})
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
