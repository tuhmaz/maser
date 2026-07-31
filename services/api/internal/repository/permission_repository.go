package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// PermissionRepository يقرأ صلاحيات الأدوار من roles/role_permissions/permissions
// (docs/database-design.md) — مصدر الحقيقة الوحيد لصلاحيات لوحة الإدارة، بدل
// خريطة ثابتة بالكود.
type PermissionRepository struct {
	db Querier
}

func NewPermissionRepository(db *pgxpool.Pool) *PermissionRepository {
	return &PermissionRepository{db: db}
}

// PermissionsForRole يعيد مجموعة مفاتيح الصلاحيات الممنوحة لدور معيّن.
// دور غير موجود أو بلا صلاحيات مُعرَّفة يعيد خريطة فارغة (وليس خطأ).
func (r *PermissionRepository) PermissionsForRole(ctx context.Context, roleName string) (map[string]bool, error) {
	rows, err := r.db.Query(ctx, `
		SELECT p.key
		FROM roles r
		JOIN role_permissions rp ON rp.role_id = r.id
		JOIN permissions p ON p.id = rp.permission_id
		WHERE r.name = $1
	`, roleName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	perms := make(map[string]bool)
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err != nil {
			return nil, err
		}
		perms[key] = true
	}
	return perms, rows.Err()
}
