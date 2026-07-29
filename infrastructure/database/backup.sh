#!/usr/bin/env bash
# infrastructure/database/backup.sh — نسخ احتياطي دوري لقاعدة بيانات الإنتاج.
# يُشغَّل عبر cron (مثال أدناه). راجع docs/deployment-plan.md لمتطلبات النسخ الاحتياطي:
# نسخة دورية، الاحتفاظ بعدة نسخ سابقة، اختبار الاستعادة فعليًا، فصل نسخة الإنتاج عن نفس القرص.

set -euo pipefail

: "${DATABASE_URL:?يجب ضبط DATABASE_URL}"
: "${BACKUP_DIR:=/var/backups/alemedu}"
: "${RETENTION_DAYS:=14}"

mkdir -p "$BACKUP_DIR"

timestamp="$(date +%Y%m%d_%H%M%S)"
out_file="$BACKUP_DIR/alemedu_${timestamp}.sql.gz"

echo "==> نسخ احتياطي إلى $out_file"
pg_dump "$DATABASE_URL" | gzip > "$out_file"

echo "==> حذف النسخ الأقدم من $RETENTION_DAYS يومًا"
find "$BACKUP_DIR" -name 'alemedu_*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "تم. حجم الملف: $(du -h "$out_file" | cut -f1)"

# مثال جدولة يومية عبر crontab (خارج هذا الملف):
# 0 3 * * * DATABASE_URL=... /opt/alemedu/infrastructure/database/backup.sh >> /var/log/alemedu-backup.log 2>&1
