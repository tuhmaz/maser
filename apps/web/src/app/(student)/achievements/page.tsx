// /achievements: نظام الإنجازات — docs/daily-plan-rules.md
// قاعدة: الإنجازات لا تعوّض التعلم ولا مسابقات عامة في النسخة الأولى.
export default function AchievementsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">الإنجازات</h1>
      <div className="rounded-lg border border-dashed p-6 text-center text-gray-500">
        ستظهر هنا إنجازاتك (أول اختبار، أول مهمة، أول مهارة متقنة...).
      </div>
    </div>
  );
}
