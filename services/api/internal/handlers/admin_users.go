package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/api/internal/audit"
	"github.com/alemedu/api/internal/middleware"
	"github.com/alemedu/api/internal/utils"
)

type AdminUsersHandler struct {
	db *pgxpool.Pool
}

func NewAdminUsersHandler(db *pgxpool.Pool) *AdminUsersHandler {
	return &AdminUsersHandler{db: db}
}

type adminUserDTO struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	DisplayName   string `json:"displayName"`
	Role          string `json:"role"`
	IsActive      bool   `json:"isActive"`
	GradeName     string `json:"gradeName,omitempty"`
	CurrentStreak int    `json:"currentStreak,omitempty"`
	CreatedAt     string `json:"createdAt"`
}

// List يدعم التصفية بالدور (?role=student) — تُستخدمها صفحتا Students وإدارة الصلاحيات.
func (h *AdminUsersHandler) List(c *fiber.Ctx) error {
	role := c.Query("role")

	rows, err := h.db.Query(c.Context(), `
		SELECT u.id, u.email, u.display_name, r.name, u.is_active,
		       COALESCE(g.name, ''), COALESCE(ss.current_streak, 0), u.created_at::text
		FROM users u
		JOIN user_roles ur ON ur.user_id = u.id
		JOIN roles r ON r.id = ur.role_id
		LEFT JOIN student_profiles sp ON sp.user_id = u.id
		LEFT JOIN grades g ON g.id = sp.grade_id
		LEFT JOIN student_streaks ss ON ss.user_id = u.id
		WHERE u.deleted_at IS NULL AND ($1 = '' OR r.name = $1)
		ORDER BY u.created_at DESC
		LIMIT 500
	`, role)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر جلب المستخدمين")
	}
	defer rows.Close()

	users := []adminUserDTO{}
	for rows.Next() {
		var u adminUserDTO
		if err := rows.Scan(&u.ID, &u.Email, &u.DisplayName, &u.Role, &u.IsActive, &u.GradeName, &u.CurrentStreak, &u.CreatedAt); err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر قراءة المستخدمين")
		}
		users = append(users, u)
	}
	return c.JSON(users)
}

type changeRoleRequest struct {
	Role string `json:"role"`
}

var assignableRoles = map[string]bool{
	"student": true, "parent": true, "content_editor": true,
	"content_reviewer": true, "support": true, "admin": true,
}

// ChangeRole يستبدل أدوار المستخدم بدور واحد جديد. super_admin مستثنى عمدًا
// من هذا المسار — لا يُمنح إلا عبر scripts/create-admin.sh مباشرة على الخادم.
func (h *AdminUsersHandler) ChangeRole(c *fiber.Ctx) error {
	actorID, _ := middleware.UserIDFromContext(c)
	targetID := c.Params("id")

	var req changeRoleRequest
	if err := c.BodyParser(&req); err != nil || !assignableRoles[req.Role] {
		return utils.ErrorResponse(c, fiber.StatusUnprocessableEntity, "validation_error", "role غير صالح")
	}

	tx, err := h.db.Begin(c.Context())
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر بدء العملية")
	}
	defer tx.Rollback(c.Context())

	if _, err := tx.Exec(c.Context(), `DELETE FROM user_roles WHERE user_id = $1`, targetID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر تحديث الصلاحية")
	}
	tag, err := tx.Exec(c.Context(), `
		INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE name = $2
	`, targetID, req.Role)
	if err != nil || tag.RowsAffected() == 0 {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "not_found", "المستخدم غير موجود")
	}
	if _, err := tx.Exec(c.Context(), `
		UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL
	`, targetID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر إلغاء الجلسات القديمة")
	}

	if err := tx.Commit(c.Context()); err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "internal_error", "تعذّر حفظ التغيير")
	}
	audit.Log(c.Context(), h.db, actorID, "user.change_role", "user", targetID, map[string]any{"newRole": req.Role})
	return c.JSON(fiber.Map{"role": req.Role})
}
