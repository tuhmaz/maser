// دورة حياة المحتوى (docs/question-model.md):
// Draft → In Review → Changes Requested → Approved → Published → Archived
const LIFECYCLE = ["Draft", "In Review", "Changes Requested", "Approved", "Published", "Archived"];

export default function QuestionsPage() {
  return (
    <div className="space-y-5">
      <header>
        <p className="admin-eyebrow">بنك الأسئلة</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">دورة حياة السؤال</h1>
        <p className="mt-2 max-w-3xl leading-7 text-slate-600">
          لا يغيّر السؤال المنشور نتائج قديمة؛ أي تعديل تعليمي ينشئ إصدارًا جديدًا.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 text-xs font-bold">
        {LIFECYCLE.map((s, i) => (
          <span key={s} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-700">
            {i + 1}. {s}
          </span>
        ))}
      </div>

      <div className="admin-empty">
        قائمة الأسئلة، البحث والتصفية، اكتشاف الأسئلة المكررة، عرض نسبة الخطأ
        وعدد مرات الاستخدام — تُبنى عبر /admin/questions/*.
        <br />
        قاعدة صارمة: لا يُعدَّل السؤال المنشور بطريقة تُغيّر نتائج قديمة —
        يُنشأ إصدار جديد بدلًا من ذلك (question_versions).
      </div>
    </div>
  );
}
