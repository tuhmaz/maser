#!/usr/bin/env bash
# scripts/migrate.sh — تطبيق/تراجع ترحيلات قاعدة بيانات Alemedu بدون أدوات خارجية إضافية (psql فقط).
#
# الاستخدام:
#   scripts/migrate.sh up              # يطبّق كل الترحيلات غير المطبَّقة بالترتيب
#   scripts/migrate.sh down            # يتراجع عن آخر ترحيل مطبَّق فقط
#   DATABASE_URL=... scripts/migrate.sh up
#
# يقرأ DATABASE_URL من البيئة، وإلا من services/api/.env

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/services/api/migrations"
ENV_FILE="$ROOT_DIR/services/api/.env"

if [[ -z "${DATABASE_URL:-}" && -f "$ENV_FILE" ]]; then
  DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | cut -d '=' -f2-)"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "خطأ: DATABASE_URL غير مضبوط (لا في البيئة ولا في services/api/.env)" >&2
  exit 1
fi

command -v psql >/dev/null 2>&1 || { echo "خطأ: يتطلب هذا السكربت أداة psql مثبَّتة." >&2; exit 1; }

ensure_migrations_table() {
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c \
    "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());"
}

cmd_up() {
  ensure_migrations_table
  for file in $(ls "$MIGRATIONS_DIR"/*.up.sql | sort); do
    version="$(basename "$file" .up.sql)"
    already=$(psql "$DATABASE_URL" -t -A -c "SELECT 1 FROM schema_migrations WHERE version = '$version'")
    if [[ "$already" == "1" ]]; then
      continue
    fi
    echo "==> تطبيق $version"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "INSERT INTO schema_migrations (version) VALUES ('$version')"
  done
  echo "تم. قاعدة البيانات محدَّثة."
}

cmd_down() {
  ensure_migrations_table
  last=$(psql "$DATABASE_URL" -t -A -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1")
  if [[ -z "$last" ]]; then
    echo "لا يوجد ترحيل مطبَّق للتراجع عنه."
    exit 0
  fi
  down_file="$MIGRATIONS_DIR/$last.down.sql"
  if [[ ! -f "$down_file" ]]; then
    echo "خطأ: ملف التراجع غير موجود: $down_file" >&2
    exit 1
  fi
  echo "==> التراجع عن $last"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$down_file"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "DELETE FROM schema_migrations WHERE version = '$last'"
  echo "تم التراجع عن $last."
}

case "${1:-}" in
  up) cmd_up ;;
  down) cmd_down ;;
  *)
    echo "الاستخدام: $0 {up|down}" >&2
    exit 1
    ;;
esac
