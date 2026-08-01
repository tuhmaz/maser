#!/usr/bin/env bash
# scripts/setup-dev.sh — تهيئة بيئة تطوير محلية لمشروع Alemedu دفعة واحدة.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> فحص الأدوات المطلوبة"
command -v go >/dev/null 2>&1 || { echo "خطأ: Go غير مثبَّت"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "خطأ: Node.js غير مثبَّت"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "خطأ: npm غير مثبَّت"; exit 1; }

echo "==> نسخ ملفات البيئة (.env.example → .env) إن لم تكن موجودة"
for f in services/api/.env services/worker/.env apps/web/.env.local apps/admin/.env.local; do
  example="$ROOT_DIR/$(dirname "$f")/.env.example"
  target="$ROOT_DIR/$f"
  if [[ -f "$example" && ! -f "$target" ]]; then
    cp "$example" "$target"
    echo "  أُنشئ: $f"
  fi
done

echo "==> تثبيت تبعيات Node (npm workspaces)"
(cd "$ROOT_DIR" && npm install)

echo "==> تنزيل تبعيات Go"
(cd "$ROOT_DIR/services/api" && go mod download)
(cd "$ROOT_DIR/services/worker" && go mod download)

cat <<'EOF'

تمت التهيئة. الخطوات التالية:
  1) شغّل PostgreSQL و Redis محليًا (أو عبر Docker)
  2) عدّل services/api/.env ببيانات الاتصال الصحيحة
  3) طبّق الترحيلات:      scripts/migrate.sh up
  4) شغّل الـ API:         cd services/api && go run ./cmd/api
  5) شغّل واجهة الطالب:    npm run dev:web
  6) شغّل لوحة الإدارة:    npm run dev:admin

EOF
