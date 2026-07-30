import Link from "next/link";

// خطوة 10 من رحلة الطالب الأولى: فتح لوحة التحكم (docs/user-journeys.md)
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="surface overflow-hidden">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.8fr] lg:p-8">
          <div>
            <p className="eyebrow">لوحة الطالب</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">ابدأ بما يهم اليوم</h1>
            <p className="mt-3 max-w-2xl leading-8 text-slate-600">
              نظرة سريعة على رحلتك. المهمة اليومية هي نقطة البداية، وبعدها تظهر لك المهارات والأخطاء التي تحتاج متابعة.
            </p>
            <Link href="/today" className="mt-6 inline-flex">
              <span className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800">
                افتح مهمتي اليوم
              </span>
            </Link>
          </div>
          <div className="rounded-md bg-slate-950 p-5 text-white">
            <p className="text-sm text-white/70">جلسة مقترحة</p>
            <p className="mt-2 text-4xl font-black">15</p>
            <p className="mt-1 text-sm text-white/70">دقيقة للشرح والمراجعة والأسئلة</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          ["المهارات المتقنة", "0", "ستُحسب بعد أول اختبار"],
          ["أخطاء للمراجعة", "0", "تظهر من دفتر الأخطاء"],
          ["سلسلة الأيام", "0", "ابدأ اليوم لبناء عادة"],
        ].map(([label, value, helper]) => (
          <article key={label} className="metric-card">
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
            <p className="mt-2 text-sm text-slate-500">{helper}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
