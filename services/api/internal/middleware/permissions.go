package middleware

import (
	"context"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/alemedu/api/internal/utils"
)

// permissionCacheTTL مدة صلاحية الصلاحيات المخزَّنة مؤقتًا داخل العملية لكل
// دور، قبل إعادة قراءتها من role_permissions. تفادي استعلام DB على كل طلب
// دون حاجة لإضافة Redis لهذا الغرض وحده.
const permissionCacheTTL = 60 * time.Second

// PermissionSource يقرأ صلاحيات دور من قاعدة البيانات (roles/role_permissions/
// permissions) — يحققها repository.PermissionRepository.
type PermissionSource interface {
	PermissionsForRole(ctx context.Context, roleName string) (map[string]bool, error)
}

type permissionCacheEntry struct {
	perms     map[string]bool
	expiresAt time.Time
}

// PermissionChecker يتحقق من صلاحيات الأدوار الإدارية الفرعية عبر قاعدة
// البيانات — بدلًا من خريطة ثابتة بالكود، كي تُدار الصلاحيات وتُوسَّع (مثلًا
// لأدوار AI مستقبلية) دون إعادة نشر الخادم.
type PermissionChecker struct {
	source PermissionSource
	mu     sync.RWMutex
	cache  map[string]permissionCacheEntry
}

func NewPermissionChecker(source PermissionSource) *PermissionChecker {
	return &PermissionChecker{source: source, cache: make(map[string]permissionCacheEntry)}
}

func (pc *PermissionChecker) permissionsForRole(ctx context.Context, role string) (map[string]bool, error) {
	pc.mu.RLock()
	entry, ok := pc.cache[role]
	pc.mu.RUnlock()
	if ok && time.Now().Before(entry.expiresAt) {
		return entry.perms, nil
	}

	perms, err := pc.source.PermissionsForRole(ctx, role)
	if err != nil {
		return nil, err
	}

	pc.mu.Lock()
	pc.cache[role] = permissionCacheEntry{perms: perms, expiresAt: time.Now().Add(permissionCacheTTL)}
	pc.mu.Unlock()
	return perms, nil
}

// RequirePermission يُستخدم بعد RequireAuth. يتحقق أن دور المستخدم يملك
// الصلاحية المحددة عبر role_permissions (admin/super_admin يملكان كل
// الصلاحيات صراحةً منذ migration 0013، لا حاجة لحالة خاصة "*").
func (pc *PermissionChecker) RequirePermission(permission string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, _ := RoleFromContext(c)
		perms, err := pc.permissionsForRole(c.Context(), role)
		if err != nil || !perms[permission] {
			return utils.ErrorResponse(c, fiber.StatusForbidden, "forbidden", "لا تملك صلاحية الوصول لهذا المورد")
		}
		return c.Next()
	}
}

// IsAdminRole يتحقق سريعًا من دور "إداري" بأي مستوى (يملك صلاحية واحدة على
// الأقل)، دون تحديد صلاحية دقيقة.
func (pc *PermissionChecker) IsAdminRole(ctx context.Context, role string) bool {
	perms, err := pc.permissionsForRole(ctx, role)
	return err == nil && len(perms) > 0
}
