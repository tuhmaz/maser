#!/usr/bin/env bash
# infrastructure/deployment/deploy.sh — نشر إصدار جديد على الخادم (staging أو production).
# يُشغَّل على الخادم نفسه ضمن /opt/alemedu بعد git pull لأحدث إصدار معتمَد.
#
# لا يُشغَّل هذا السكربت مباشرة من جهاز التطوير على بيئة الإنتاج (راجع docs/deployment-plan.md).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "==> بناء الخدمة الخلفية (API)"
(cd services/api && go build -o bin/alemedu-api ./cmd/api)

echo "==> بناء Worker"
(cd services/worker && go build -o bin/alemedu-worker ./cmd/worker)

echo "==> تثبيت تبعيات Node وبناء الواجهات"
npm ci
npm run build:web
npm run build:admin

echo "==> تطبيق ترحيلات قاعدة البيانات"
scripts/migrate.sh up

echo "==> إعادة تشغيل الخدمات (systemd)"
sudo systemctl restart alemedu-api.service
sudo systemctl restart alemedu-worker.service
sudo systemctl restart alemedu-web.service
sudo systemctl restart alemedu-admin.service

echo "==> فحص الحالة"
sudo systemctl --no-pager status alemedu-api.service alemedu-worker.service alemedu-web.service alemedu-admin.service

echo "تم النشر."
