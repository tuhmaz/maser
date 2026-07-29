# أحداث التحليلات

## الأحداث الأساسية

```
page_view
register_started
register_completed
onboarding_completed
diagnostic_started
diagnostic_completed
quiz_started
question_answered
quiz_completed
mistake_created
mistake_reviewed
daily_plan_opened
daily_task_completed
skill_mastered
student_returned
```

## خصائص الحدث (Event Properties)

الصف، المادة، الوحدة، نوع الاختبار، مصدر الزيارة، نوع الجهاز، مدة الجلسة، نتيجة المحاولة.

## قواعد الخصوصية في التحليلات

- عدم إرسال نص السؤال الكامل إلى أدوات التحليل الخارجية دون حاجة
- عدم إرسال بيانات حساسة
- استخدام معرفات تحليل غير مباشرة
- احترام إعدادات الموافقة (consent)
- سياسة واضحة للاحتفاظ بالبيانات

## الربط مع موقع الإيمان (attribution)

عند قدوم زائر من alemancenter.com عبر رابط موسوم:

```
utm_source=alemancenter
utm_medium=internal
utm_campaign=alemedu_launch
utm_content=lesson_card
```

**البيانات المطلوب ربطها بجلسة الزائر:**
- الصفحة التي جاء منها المستخدم على موقع الإيمان
- الإعلان/الرابط الذي ضغط عليه
- هل سجّل حسابًا؟
- هل بدأ الاختبار؟
- هل أكمله؟
- هل عاد لاحقًا؟

## مؤشرات النجاح المشتقة من هذه الأحداث

راجع قسم "مؤشرات نجاح المنتج" في [`product-requirements.md`](product-requirements.md) — كل الأحداث أعلاه هي المصدر الخام لحساب: نسب إكمال التسجيل، نسب إكمال الاختبار، معدل العودة، سلاسل الأيام، ومعدل التعلم.
