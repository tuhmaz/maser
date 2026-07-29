# تصميم قاعدة البيانات

قاعدة البيانات: **PostgreSQL**. مرجع الترحيلات الفعلي: [`services/api/migrations/`](../services/api/migrations).

## قواعد عامة

- استخدام معرفات غير متوقعة (UUID) كمفاتيح أساسية لكل الجداول العامة للمستخدمين والمحتوى.
- تسجيل `created_at` و `updated_at` في كل جدول.
- دعم الحذف المنطقي (`deleted_at`) عند الحاجة بدلًا من الحذف الفعلي للبيانات التاريخية.
- **عدم تعديل السؤال المنشور بطريقة تُغيّر نتائج قديمة** — يُنشأ إصدار جديد (`question_versions`) بعد النشر.
- تُحفظ نسخة السؤال داخل المحاولة (`attempt_answers.question_snapshot`) حتى تبقى النتيجة قابلة للمراجعة.

## مجموعات الجداول

### 1. الحسابات والمصادقة
`users`, `user_sessions`, `user_roles`, `roles`, `permissions`, `role_permissions`, `password_reset_tokens`, `email_verification_tokens`, `login_events`

### 2. الطلاب وأولياء الأمور
`student_profiles`, `student_preferences`, `student_subjects`, `parent_profiles`, `parent_student_links`

### 3. المنهاج
`countries`, `curricula`, `academic_years`, `grades`, `semesters`, `subjects`, `units`, `lessons`, `skills`, `lesson_skills`, `skill_prerequisites`, `learning_objectives`

### 4. الأسئلة
`questions`, `question_versions`, `question_options`, `question_answers`, `question_explanations`, `question_media`, `question_skills`, `question_tags`, `question_reports`

### 5. الاختبارات
`quizzes`, `quiz_sections`, `quiz_questions`, `attempts`, `attempt_answers`, `attempt_events`, `attempt_results`

### 6. التعلم (إتقان + مراجعة + خطط)
`student_skill_mastery`, `student_mistakes`, `review_schedules`, `daily_plans`, `daily_tasks`, `task_completions`, `student_streaks`, `achievements`, `student_achievements`

### 7. الإدارة والتدقيق
`content_reviews`, `content_publications`, `audit_logs`, `system_events`, `feature_flags`

## الفهارس الأساسية المطلوبة (للأداء)

تُنشأ فهارس خاصة على:
- المستخدم (`user_id` في الجداول العلائقية)
- المادة (`subject_id`)
- المهارة (`skill_id`)
- المحاولة (`attempt_id`)
- وقت الإنشاء (`created_at`) للترتيب الزمني والتقارير
- حالة النشر (`status`) في جداول المحتوى
- موعد المراجعة (`review_schedules.due_at`)
- الطالب والمهارة معًا (`(student_id, skill_id)` composite) في `student_skill_mastery` و`student_mistakes`

## أنواع الحسابات (roles seed)

```
student
parent
content_editor
content_reviewer
support
admin
super_admin
```

## حالات المهارة (skill mastery states)

```
not_started | introduced | practicing | developing | mastered | needs_review
```

## دورة حياة المحتوى (question/content status)

```
draft | in_review | changes_requested | approved | published | archived
```

راجع [`services/api/migrations/`](../services/api/migrations) للـ SQL الفعلي المطبَّق لكل مجموعة من هذه الجداول.
