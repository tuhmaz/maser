export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="admin-eyebrow">لوحة التشغيل</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">حالة المحتوى والتجربة</h1>
        <p className="mt-2 max-w-3xl leading-7 text-slate-600">
          نظرة عامة على دورة المنهاج والأسئلة والمستخدمين حسب صلاحيات محرر المحتوى، المراجع، الناشر، الدعم، والمدير.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          ["أسئلة منشورة", "0"],
          ["بانتظار المراجعة", "0"],
          ["طلاب التجربة", "0"],
          ["مشاكل محتوى", "0"],
        ].map(([label, value]) => (
          <article key={label} className="admin-surface p-4">
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
          </article>
        ))}
      </section>

      <section className="admin-surface p-5">
        <h2 className="text-lg font-black text-slate-950">بوابة MVP</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          الأردن، الصف السابع، الرياضيات، فصل دراسي واحد. أي صف أو مادة أو نموذج دفع جديد يحتاج قرار نطاق موثق.
        </p>
      </section>
    </div>
  );
}
