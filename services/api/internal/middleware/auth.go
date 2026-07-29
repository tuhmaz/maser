package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	"github.com/alemedu/api/internal/utils"
)

const (
	localsUserID = "userID"
	localsRole   = "role"
)

// RequireAuth يتحقق من رمز الوصول (Bearer JWT) قبل السماح بالوصول للمسار.
// القاعدة الذهبية: لا تثق بالواجهة الأمامية — كل صلاحية تُتحقَّق هنا في الخادم.
func RequireAuth(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			return utils.ErrorResponse(c, fiber.StatusUnauthorized, "unauthorized", "رمز الوصول مفقود")
		}

		tokenString := strings.TrimPrefix(header, "Bearer ")
		claims, err := utils.ParseAccessToken(secret, tokenString)
		if err != nil {
			return utils.ErrorResponse(c, fiber.StatusUnauthorized, "unauthorized", "رمز الوصول غير صالح أو منتهٍ")
		}

		c.Locals(localsUserID, claims.UserID)
		c.Locals(localsRole, claims.Role)
		return c.Next()
	}
}

// RequireRole يُستخدم بعد RequireAuth للتحقق من أن دور المستخدم ضمن الأدوار المسموحة
// (مثال: مسارات /admin/* تتطلب أحد أدوار الإدارة).
func RequireRole(allowedRoles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, _ := c.Locals(localsRole).(string)
		for _, allowed := range allowedRoles {
			if role == allowed {
				return c.Next()
			}
		}
		return utils.ErrorResponse(c, fiber.StatusForbidden, "forbidden", "لا تملك صلاحية الوصول لهذا المورد")
	}
}

func UserIDFromContext(c *fiber.Ctx) (string, bool) {
	id, ok := c.Locals(localsUserID).(string)
	return id, ok && id != ""
}

func RoleFromContext(c *fiber.Ctx) (string, bool) {
	role, ok := c.Locals(localsRole).(string)
	return role, ok && role != ""
}
