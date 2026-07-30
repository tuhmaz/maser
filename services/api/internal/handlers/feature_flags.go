package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/audit"
	"github.com/alemedu/api/internal/middleware"
	"github.com/alemedu/api/internal/utils"
)

type FeatureFlagsHandler struct {
	db *pgxpool.Pool
}

func NewFeatureFlagsHandler(db *pgxpool.Pool) *FeatureFlagsHandler {
	return &FeatureFlagsHandler{db: db}
}

type featureFlagDTO struct {
	Key               string `json:"key"`
	IsEnabled         bool   `json:"isEnabled"`
	RolloutPercentage int    `json:"rolloutPercentage"`
	Description       string `json:"description,omitempty"`
}

// PublicList يعيد قيم الأعلام فقط (بلا تفاصيل إدارية) — تستخدمها الواجهات
// العامة لإيقاف/تشغيل ميزة فورًا دون نشر جديد (docs/deployment-plan.md).
func (h *FeatureFlagsHandler) PublicList(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.Context(), `SELECT key, is_enabled FROM feature_flags`)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب الأعلام")
	}
	defer rows.Close()
	flags := fiber.Map{}
	for rows.Next() {
		var key string
		var enabled bool
		if err := rows.Scan(&key, &enabled); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة الأعلام")
		}
		flags[key] = enabled
	}
	return c.JSON(flags)
}

func (h *FeatureFlagsHandler) AdminList(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.Context(), `
		SELECT key, is_enabled, rollout_percentage, COALESCE(description, '') FROM feature_flags ORDER BY key
	`)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب الأعلام")
	}
	defer rows.Close()
	flags := []featureFlagDTO{}
	for rows.Next() {
		var f featureFlagDTO
		if err := rows.Scan(&f.Key, &f.IsEnabled, &f.RolloutPercentage, &f.Description); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة الأعلام")
		}
		flags = append(flags, f)
	}
	return c.JSON(flags)
}

type updateFlagRequest struct {
	IsEnabled         *bool `json:"isEnabled"`
	RolloutPercentage *int  `json:"rolloutPercentage"`
}

func (h *FeatureFlagsHandler) AdminUpdate(c *fiber.Ctx) error {
	userID, _ := middleware.UserIDFromContext(c)
	key := c.Params("key")

	var req updateFlagRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "invalid_body", "تعذّرت قراءة الطلب")
	}
	if req.RolloutPercentage != nil && (*req.RolloutPercentage < 0 || *req.RolloutPercentage > 100) {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error", "rolloutPercentage بين 0 و100")
	}

	tag, err := h.db.Exec(c.Context(), `
		UPDATE feature_flags SET
			is_enabled = COALESCE($2, is_enabled),
			rollout_percentage = COALESCE($3, rollout_percentage),
			updated_at = now()
		WHERE key = $1
	`, key, req.IsEnabled, req.RolloutPercentage)
	if err != nil || tag.RowsAffected() == 0 {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "العلم غير موجود")
	}
	audit.Log(c.Context(), h.db, userID, "feature_flag.update", "feature_flag", key, map[string]any{
		"isEnabled": req.IsEnabled, "rolloutPercentage": req.RolloutPercentage,
	})
	return c.JSON(fiber.Map{"updated": true})
}
