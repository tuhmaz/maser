// /review: المراجعة المجدولة — دورة "خطأ جديد → مراجعة قريبة → مراجعة لاحقة → اختبار تثبيت → متقن"
export default function ReviewPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">المراجعة المجدولة</h1>
      <div className="rounded-lg border border-dashed p-6 text-center text-gray-500">
        لا يُغرَق الطالب بعشرات الأخطاء في جلسة واحدة (docs/mastery-model.md).
      </div>
    </div>
  );
}
