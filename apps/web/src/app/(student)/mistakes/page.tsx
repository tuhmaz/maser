// /mistakes: دفتر الأخطاء — docs/mastery-model.md
export default function MistakesPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">دفتر الأخطاء</h1>
      <div className="rounded-lg border border-dashed p-6 text-center text-gray-500">
        أخطاء اليوم، أخطاء تحتاج مراجعة، أخطاء متكررة، مهارات ضعيفة — ستظهر
        هنا بعد ربط GET /mistakes و GET /mistakes/due.
      </div>
    </div>
  );
}
