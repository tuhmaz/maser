#!/usr/bin/env bash
# infrastructure/database/restore.sh — يستعيد نسخة احتياطية (custom format من
# backup.sh) إلى قاعدة بيانات جديدة/فارغة افتراضيًا — لا يلمس أي قاعدة قائمة
# إلا بتمرير RESTORE_MODE=--clean-existing صراحةً.
#
# سابقًا: كان يضخّ SQL نصي خام (`gunzip | psql`) داخل TARGET_DATABASE_URL
# "كأنه" استبدال كامل رغم عدم وجود --clean، فيفشل غالبًا بسبب تعارض الجداول
# الموجودة أو يترك حالة جزئية دون أي تحقق من نجاح الاستعادة فعليًا.
#
# الاستخدام:
#   TARGET_DATABASE_URL=postgres://user:pass@host:5432/alemedu_restore_test \
#     infrastructure/database/restore.sh /var/backups/alemedu/alemedu_20260731.dump
#
#   # لاستبدال قاعدة قائمة فعليًا (خطر — تأكد من نسخة احتياطية حديثة أولًا):
#   RESTORE_MODE=--clean-existing TARGET_DATABASE_URL=... restore.sh backup.dump

set -euo pipefail

dump_file="${1:?الاستخدام: restore.sh <path-to-dump-file>}"
: "${TARGET_DATABASE_URL:?يجب ضبط TARGET_DATABASE_URL (قاعدة الاستعادة — لا تجعلها قاعدة الإنتاج الحية)}"

if [[ ! -f "$dump_file" ]]; then
  echo "خطأ: الملف غير موجود: $dump_file" >&2
  exit 1
fi

echo "==> التحقق من البصمة إن وُجد ملف .sha256 مرافق"
if [[ -f "$dump_file.sha256" ]]; then
  if ! sha256sum -c "$dump_file.sha256" --status; then
    echo "خطأ: بصمة SHA-256 لا تطابق الملف — الأرشيف قد يكون تالفًا" >&2
    exit 1
  fi
  echo "    البصمة مطابقة."
else
  echo "    تحذير: لا يوجد ملف .sha256 مرافق — تخطّي التحقق."
fi

echo "==> التحقق من صحة بنية الأرشيف (pg_restore --list)"
pg_restore --list "$dump_file" > /dev/null

if [[ "${RESTORE_MODE:-}" == "--clean-existing" ]]; then
  echo "==> استعادة مع --clean --if-exists داخل القاعدة الحالية (خطر: تستبدل المحتوى القائم)"
  pg_restore --clean --if-exists --no-owner --dbname="$TARGET_DATABASE_URL" "$dump_file"
else
  echo "==> استعادة إلى قاعدة جديدة/فارغة (الوضع الآمن الافتراضي)"
  pg_restore --no-owner --dbname="$TARGET_DATABASE_URL" "$dump_file"
fi

echo "==> فحص ما بعد الاستعادة: عدد الجداول المُنشأة"
table_count=$(psql "$TARGET_DATABASE_URL" -t -A -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
echo "    عدد الجداول: $table_count"
if [[ "$table_count" -lt 1 ]]; then
  echo "خطأ: الاستعادة لم تُنشئ أي جدول — فشل صامت محتمل" >&2
  exit 1
fi

echo "تم. الاستعادة نجحت وتحققت من إنشاء $table_count جدولًا."
