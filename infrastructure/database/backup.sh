#!/usr/bin/env bash
# infrastructure/database/backup.sh — نسخ احتياطي دوري لقاعدة بيانات الإنتاج.
#
# يستخدم صيغة pg_dump المخصَّصة (--format=custom) بدل SQL نصي خام مضغوط:
# - تسمح بالتحقق من سلامة الملف عبر `pg_restore --list` دون استعادة فعلية.
# - تدعم استعادة انتقائية واستعادة متوازية (pg_restore -j).
# - أصغر حجمًا (ضغط مدمج) من `pg_dump | gzip`.
# يُرفَق SHA-256 لكل نسخة لاكتشاف أي تلف/تحريف في الملف قبل الاعتماد عليه.
#
# راجع docs/deployment-plan.md ومحص restore.sh لاختبار الاستعادة الفعلي.

set -euo pipefail

: "${DATABASE_URL:?يجب ضبط DATABASE_URL}"
: "${BACKUP_DIR:=/var/backups/alemedu}"
: "${RETENTION_DAYS:=14}"

mkdir -p "$BACKUP_DIR"

timestamp="$(date +%Y%m%d_%H%M%S)"
out_file="$BACKUP_DIR/alemedu_${timestamp}.dump"

echo "==> نسخ احتياطي (custom format) إلى $out_file"
pg_dump "$DATABASE_URL" --format=custom --file="$out_file"

echo "==> التحقق من سلامة الأرشيف (بلا استعادة فعلية)"
pg_restore --list "$out_file" > /dev/null

echo "==> حساب SHA-256"
sha256sum "$out_file" > "$out_file.sha256"

echo "==> حذف النسخ الأقدم من $RETENTION_DAYS يومًا"
find "$BACKUP_DIR" -name 'alemedu_*.dump' -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name 'alemedu_*.dump.sha256' -mtime +"$RETENTION_DAYS" -delete

echo "تم. حجم الملف: $(du -h "$out_file" | cut -f1)"
echo "الأرشيف: $out_file"
echo "البصمة: $(cat "$out_file.sha256")"

# مثال جدولة يومية عبر crontab (خارج هذا الملف):
# 0 3 * * * DATABASE_URL=... /opt/alemedu/infrastructure/database/backup.sh >> /var/log/alemedu-backup.log 2>&1
#
# تذكير: نسخة احتياطية لم تُختبر استعادتها فعليًا لا تُعتبر نسخة موثوقة —
# شغّل restore.sh على قاعدة تجريبية دوريًا (raz.sh ربع سنوي على الأقل).
