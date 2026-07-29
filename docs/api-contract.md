# مرجع عقد الـ API

المرجع الرسمي القابل للتوليد: [`contracts/openapi/openapi.yaml`](../contracts/openapi/openapi.yaml). هذا الملف شرح نصي مختصر لنفس العقد.

## المصادقة

```
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/refresh
POST /auth/forgot-password
POST /auth/reset-password
GET  /auth/me
```

## التهيئة (Onboarding)

```
GET  /onboarding/options
POST /onboarding/complete
```

## المنهاج

```
GET /grades
GET /grades/{gradeId}/subjects
GET /subjects/{subjectId}
GET /subjects/{subjectId}/units
GET /units/{unitId}/lessons
GET /lessons/{lessonId}
```

## الاختبارات

```
POST /diagnostic/start
POST /quizzes/{quizId}/start
GET  /attempts/{attemptId}
POST /attempts/{attemptId}/answers
POST /attempts/{attemptId}/submit
GET  /attempts/{attemptId}/result
```

## التقدم

```
GET /progress
GET /progress/subjects/{subjectId}
GET /progress/skills
GET /progress/skills/{skillId}
```

## دفتر الأخطاء

```
GET  /mistakes
GET  /mistakes/due
POST /mistakes/{mistakeId}/review
```

## المهمة اليومية

```
GET  /daily-plan
POST /daily-plan/generate
POST /daily-tasks/{taskId}/start
POST /daily-tasks/{taskId}/complete
```

## الإدارة (Admin)

```
/admin/curricula/*
/admin/subjects/*
/admin/lessons/*
/admin/skills/*
/admin/questions/*
/admin/quizzes/*
/admin/reviews/*
/admin/users/*
/admin/reports/*
```

## قواعد الـ API الإلزامية

- إصدار واضح للمسارات عند الحاجة (`/v1/...` عند أول breaking change)
- رسائل خطأ موحدة (شكل JSON ثابت: `{ "error": { "code", "message" } }`)
- Validation على كل طلب (لا يصل طلب غير صالح إلى طبقة الخدمة)
- Pagination لكل القوائم (`page`, `page_size` أو cursor-based)
- Rate limiting (خصوصًا على `/auth/*`)
- Idempotency للعمليات الحساسة (تسليم المحاولة، إتمام المهمة)
- Audit log لكل عمليات الإدارة
- عدم كشف أخطاء قاعدة البيانات للمستخدم مباشرة
- توثيق كامل عبر OpenAPI (مصدر الحقيقة لكل تغيير في العقد)

## قاعدة الأمان الذهبية

**لا تثق بالواجهة الأمامية.** كل صلاحية، نتيجة، اشتراك، أو تقدّم يجب التحقق منه داخل الخادم بغض النظر عمّا ترسله الواجهة.
