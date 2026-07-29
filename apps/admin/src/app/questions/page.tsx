// دورة حياة المحتوى (docs/question-model.md):
// Draft → In Review → Changes Requested → Approved → Published → Archived
const LIFECYCLE = ["Draft", "In Review", "Changes Requested", "Approved", "Published", "Archived"];

export default function QuestionsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Questions</h1>

      <div className="flex flex-wrap gap-2 text-xs">
        {LIFECYCLE.map((s, i) => (
          <span key={s} className="rounded-full border px-3 py-1">
            {i + 1}. {s}
          </span>
        ))}
      </div>

      <div className="rounded-lg border border-dashed p-6 text-gray-500">
        قائمة الأسئلة، البحث والتصفية، اكتشاف الأسئلة المكررة، عرض نسبة الخطأ
        وعدد مرات الاستخدام — تُبنى عبر /admin/questions/*.
        <br />
        قاعدة صارمة: لا يُعدَّل السؤال المنشور بطريقة تُغيّر نتائج قديمة —
        يُنشأ إصدار جديد بدلًا من ذلك (question_versions).
      </div>
    </div>
  );
}
