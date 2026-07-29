// /today: تعرض خطة اليوم من GET /daily-plan (docs/daily-plan-rules.md).
// المسار مسجَّل في الـ API لكن منطقه لم يُبنَ بعد (خطوة "بناء المهمة اليومية" في ترتيب التنفيذ).
export default function TodayPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">مهمتي اليوم</h1>
      <div className="rounded-lg border border-dashed p-6 text-center text-gray-500">
        ستظهر هنا خطتك اليومية: مراجعة قصيرة، شرح، أسئلة جديدة، سؤال من دفتر
        الأخطاء، واختبار تثبيت — بمجرد اكتمال محرك الاختبارات ونظام الإتقان.
      </div>
    </div>
  );
}
