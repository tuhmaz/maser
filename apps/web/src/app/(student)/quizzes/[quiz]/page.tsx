// /quizzes/[quiz]: محرك الاختبار الفعلي — docs/daily-plan-rules.md (دورة تنفيذ الاختبار).
// يُبنى بعد تفعيل POST /quizzes/{quizId}/start و /attempts/{attemptId}/answers في الـ API.
export default function QuizPage({ params }: { params: { quiz: string } }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">الاختبار</h1>
      <div className="rounded-lg border border-dashed p-6 text-center text-gray-500">
        محرك الاختبارات قيد البناء (معرّف الاختبار: {params.quiz}).
        <br />
        القاعدة الحاكمة: لا تعتمد النتيجة على الواجهة أبدًا — الحساب النهائي
        يتم داخل الخادم فقط.
      </div>
    </div>
  );
}
