# Alemedu

منصة تعليمية تكيّفية تحدد مستوى الطالب، تبني له خطة يومية، تختبره، تحفظ أخطاءه في دفتر أخطاء، وتعيد تدريبه عليها حتى يتقن كل مهارة.

> اسم المشروع "Alemedu" مؤقت. راجع [`docs/product-requirements.md`](docs/product-requirements.md) للرؤية الكاملة.

## النطاق الحالي (النسخة التجريبية الأولى)

- الدولة: الأردن
- الصف: السابع
- المادة: الرياضيات
- الفصل: فصل دراسي واحد
- الاستخدام: مجاني تجريبي

راجع [`docs/acceptance-criteria.md`](docs/acceptance-criteria.md) لمعايير اكتمال هذه النسخة.

## هيكل المستودع (Monorepo)

```
alemedu/
├── apps/
│   ├── web/            # واجهة الطالب - Next.js (alemedu.com)
│   └── admin/          # لوحة الإدارة - Next.js (admin.alemedu.com)
│
├── services/
│   ├── api/             # الخدمة الخلفية - Go + Fiber (api.alemedu.com)
│   └── worker/          # مهام خلفية (جدولة المراجعة، إلخ)
│
├── packages/
│   ├── ui/               # مكونات واجهة مشتركة
│   ├── config/            # إعدادات مشتركة (eslint, tsconfig, ...)
│   ├── validation/        # مخططات تحقق مشتركة (Zod)
│   └── api-client/        # عميل TypeScript مولّد من عقد OpenAPI
│
├── contracts/
│   └── openapi/            # عقد الـ API الرسمي
│
├── infrastructure/
│   ├── nginx/
│   ├── systemd/
│   ├── database/
│   └── deployment/
│
├── scripts/                # سكربتات التطوير والنشر
├── docs/                   # وثائق المنتج والهندسة (المرجع الرسمي)
├── tests/                  # اختبارات تكامل/e2e عابرة للخدمات
└── README.md
```

## البيئات

| البيئة | الواجهة | API | الإدارة |
|---|---|---|---|
| محلية | localhost:3000 | localhost:8080 | localhost:3001 |
| اختبار | staging.alemedu.com | staging-api.alemedu.com | staging-admin.alemedu.com |
| إنتاج | alemedu.com | api.alemedu.com | admin.alemedu.com |

البيئات لا تشارك نفس قاعدة البيانات أبدًا. راجع [`docs/deployment-plan.md`](docs/deployment-plan.md).

## البدء السريع (تطوير محلي)

### المتطلبات
- Go 1.25+
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### 0) قاعدة البيانات و Redis (عبر Docker، اختياري)

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 1) الخدمة الخلفية (API)

```bash
cd services/api
cp .env.example .env      # ثم عدّل بيانات الاتصال بقاعدة البيانات
go run ./cmd/api
```

### 2) قاعدة البيانات

```bash
# تشغيل migrations (يتطلب أداة golang-migrate مثبّتة أو استخدم scripts/migrate.sh)
scripts/migrate.sh up
```

### 3) واجهة الطالب

```bash
cd apps/web
npm install
npm run dev
```

### 4) لوحة الإدارة

```bash
cd apps/admin
npm install
npm run dev
```

## الوثائق المرجعية

جميع القرارات المنتجية والهندسية موثّقة في [`docs/`](docs/):

| الملف | المحتوى |
|---|---|
| `product-requirements.md` | تعريف المنتج، المستخدمون، نطاق MVP |
| `user-journeys.md` | رحلات المستخدمين وخرائط الصفحات |
| `curriculum-structure.md` | هيكل المنهاج والمهارات |
| `question-model.md` | نموذج السؤال ودورة حياة المحتوى |
| `mastery-model.md` | نظام إتقان المهارات ودفتر الأخطاء |
| `daily-plan-rules.md` | قواعد توليد المهمة اليومية |
| `database-design.md` | تصميم قاعدة البيانات الكامل |
| `api-contract.md` | مرجع نقاط الـ API |
| `security-requirements.md` | متطلبات الأمان |
| `analytics-events.md` | أحداث التحليلات |
| `deployment-plan.md` | خطة البيئات والنشر |
| `acceptance-criteria.md` | معايير قبول النسخة التجريبية |

## القاعدة الذهبية

> Alemedu منتج مستقل بالكامل. لا تُخلط قاعدته أو خدماته أو مستودعاته مع موقع الإيمان (alemancenter.com) بأي شكل. العلاقة الوحيدة بينهما هي روابط إعلانية موسومة (UTM).
