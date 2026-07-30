package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/middleware"
	"github.com/alemedu/api/internal/utils"
)

type AchievementsHandler struct {
	db *pgxpool.Pool
}

func NewAchievementsHandler(db *pgxpool.Pool) *AchievementsHandler {
	return &AchievementsHandler{db: db}
}

type achievementDTO struct {
	Key         string  `json:"key"`
	Title       string  `json:"title"`
	Description string  `json:"description,omitempty"`
	Earned      bool    `json:"earned"`
	EarnedAt    *string `json:"earnedAt,omitempty"`
}

// List يعيد كتالوج الإنجازات كاملًا مع حالة كل واحد للطالب الحالي
// (docs/daily-plan-rules.md: الإنجازات لا تعوّض التعلم، تُعرَض بوضوح لا أكثر).
func (h *AchievementsHandler) List(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)

	rows, err := h.db.Query(c.Context(), `
		SELECT a.key, a.title, COALESCE(a.description, ''), sa.earned_at IS NOT NULL, sa.earned_at::text
		FROM achievements a
		LEFT JOIN student_achievements sa ON sa.achievement_id = a.id AND sa.user_id = $1
		ORDER BY sa.earned_at IS NULL, sa.earned_at DESC, a.title
	`, userID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب الإنجازات")
	}
	defer rows.Close()

	items := []achievementDTO{}
	for rows.Next() {
		var a achievementDTO
		if err := rows.Scan(&a.Key, &a.Title, &a.Description, &a.Earned, &a.EarnedAt); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة الإنجازات")
		}
		items = append(items, a)
	}
	return c.JSON(items)
}
