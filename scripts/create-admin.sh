#!/usr/bin/env bash
# scripts/create-admin.sh — إنشاء (أو ترقية) حساب أدمن.
#
# الاستخدام:
#   scripts/create-admin.sh <email> <password> [display_name]
#
# يستخدم حاوية Docker المحلية (maser-postgres-1) افتراضيًا؛
# اضبط PSQL_CMD لتشغيله على بيئة أخرى.
#
# التجزئة تتم عبر pgcrypto (bcrypt/$2a$) وهي متوافقة مع تحقق Go bcrypt في الخادم.

set -euo pipefail

EMAIL="${1:?الاستخدام: create-admin.sh <email> <password> [display_name]}"
PASSWORD="${2:?كلمة المرور مطلوبة}"
DISPLAY_NAME="${3:-مدير النظام}"

if [[ ${#PASSWORD} -lt 8 ]]; then
  echo "خطأ: كلمة المرور 8 أحرف على الأقل" >&2
  exit 1
fi

: "${PSQL_CMD:=docker exec -i maser-postgres-1 psql -U alemedu -d alemedu_dev}"

$PSQL_CMD -v ON_ERROR_STOP=1 \
  -v email="$EMAIL" -v password="$PASSWORD" -v display_name="$DISPLAY_NAME" <<'SQL'
-- إنشاء المستخدم إن لم يوجد، أو تحديث كلمة مروره إن وُجد
INSERT INTO users (email, password_hash, display_name)
VALUES (:'email', crypt(:'password', gen_salt('bf')), :'display_name')
ON CONFLICT (email) DO UPDATE SET
  password_hash = crypt(:'password', gen_salt('bf')),
  display_name = EXCLUDED.display_name,
  is_active = true,
  updated_at = now();

-- منح دور admin
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = :'email' AND r.name = 'admin'
ON CONFLICT DO NOTHING;

-- إلغاء أي جلسات قديمة بعد تغيير كلمة المرور
UPDATE user_sessions SET revoked_at = now()
WHERE user_id = (SELECT id FROM users WHERE email = :'email') AND revoked_at IS NULL;

SELECT u.email, u.display_name, array_agg(r.name) AS roles
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id
WHERE u.email = :'email'
GROUP BY u.email, u.display_name;
SQL

echo "تم: حساب الأدمن جاهز ($EMAIL)"
