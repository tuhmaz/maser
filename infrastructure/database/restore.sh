#!/usr/bin/env bash
# infrastructure/database/restore.sh — استعادة قاعدة البيانات من نسخة احتياطية.
# يجب اختبار هذا السكربت فعليًا وبشكل دوري (شرط قبول في docs/deployment-plan.md)،
# وليس الاكتفاء بافتراض أنه يعمل.

set -euo pipefail

: "${DATABASE_URL:?يجب ضبط DATABASE_URL}"

backup_file="${1:?الاستخدام: restore.sh <path-to-backup.sql.gz>}"

if [[ ! -f "$backup_file" ]]; then
  echo "خطأ: الملف غير موجود: $backup_file" >&2
  exit 1
fi

echo "تحذير: سيتم استبدال محتوى قاعدة البيانات الحالية بالكامل."
read -r -p "اكتب 'yes' للمتابعة: " confirm
if [[ "$confirm" != "yes" ]]; then
  echo "أُلغيت العملية."
  exit 1
fi

echo "==> استعادة من $backup_file"
gunzip -c "$backup_file" | psql "$DATABASE_URL" -v ON_ERROR_STOP=1

echo "تمت الاستعادة."
