// /results/[attempt]: تقرير النتيجة — docs/mastery-model.md (متقن / جيد / يحتاج مراجعة / يحتاج تأسيس)
export default function ResultPage({ params }: { params: { attempt: string } }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">النتيجة</h1>
      <div className="rounded-lg border border-dashed p-6 text-center text-gray-500">
        سيُعرض هنا تقرير مفهوم (وليس رقمًا فقط) للمحاولة {params.attempt}، بعد
        اكتمال GET /attempts/&#123;attemptId&#125;/result.
      </div>
    </div>
  );
}
