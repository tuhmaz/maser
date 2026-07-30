// /achievements: نظام الإنجازات — docs/daily-plan-rules.md
// قاعدة: الإنجازات لا تعوّض التعلم ولا مسابقات عامة في النسخة الأولى.
export default function AchievementsPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">الإنجازات</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">إنجازات تدعم التعلم</h1>
        <p className="mt-2 max-w-2xl leading-7 text-slate-600">
          الإنجازات هنا بسيطة ومتصلة بالتقدم الحقيقي، لا مسابقات عامة في النسخة الأولى.
        </p>
      </header>
      <section className="grid gap-3 md:grid-cols-3">
        {["أول اختبار", "أول مهمة مكتملة", "أول مهارة متقنة"].map((label) => (
          <article key={label} className="surface p-5">
            <div className="mb-4 h-10 w-10 rounded-md bg-amber-100" />
            <h2 className="font-black text-slate-950">{label}</h2>
            <p className="mt-2 text-sm text-slate-500">لم يفتح بعد.</p>
          </article>
        ))}
      </section>
    </div>
  );
}
