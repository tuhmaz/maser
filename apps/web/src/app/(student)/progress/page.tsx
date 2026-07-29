// /progress: لوحة تقدم الطالب — docs/daily-plan-rules.md
// عناصر مطلوبة: نسبة إكمال المادة، المهارات المتقنة، سلسلة الأيام، تحسن آخر أسبوع...
export default function ProgressPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">التقدم</h1>
      <div className="rounded-lg border border-dashed p-6 text-center text-gray-500">
        لا أرقام غامضة بلا تفسير — كل نسبة يجب أن تكون مفهومة (شرط قبول إلزامي).
      </div>
    </div>
  );
}
