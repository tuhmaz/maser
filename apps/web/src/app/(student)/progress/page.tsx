"use client";

import { useEffect, useState } from "react";
import type { ProgressOverview, SkillProgress, SkillState } from "@alemedu/api-client";
import { api } from "@/lib/api";

// /progress: لوحة تقدم الطالب — docs/daily-plan-rules.md
// عناصر مطلوبة: نسبة إكمال المادة، المهارات المتقنة، سلسلة الأيام، تحسن آخر أسبوع...
const STATE_LABELS: Record<SkillState, string> = {
  mastered: "متقن",
  developing: "جيد",
  needs_review: "يحتاج مراجعة",
  practicing: "قيد التدرّب",
  introduced: "بدأت للتو",
  not_started: "لم تبدأ",
};

export default function ProgressPage() {
  const [overview, setOverview] = useState<ProgressOverview | null>(null);
  const [skills, setSkills] = useState<SkillProgress[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.progressOverview(), api.progressSkills()])
      .then(([o, s]) => {
        setOverview(o);
        setSkills(s);
      })
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب التقدم"));
  }, []);

  const completion =
    overview && overview.skills.total > 0
      ? Math.round((overview.skills.mastered / overview.skills.total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">التقدم</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">أرقام مفهومة للطالب</h1>
        <p className="mt-2 max-w-2xl leading-7 text-slate-600">
          كل نسبة هنا يجب أن تشرح ماذا أتقن الطالب وماذا يراجع بعد ذلك.
        </p>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="surface p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">إكمال المادة</h2>
            <p className="mt-1 text-sm text-slate-500">تُحتسب من المهارات المتقنة وليس عدد الصفحات.</p>
          </div>
          <span className="text-3xl font-black text-teal-700">{completion}%</span>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-teal-700" style={{ width: `${completion}%` }} />
        </div>
      </section>

      {overview && (
        <section className="grid gap-3 sm:grid-cols-4">
          {[
            ["مهارات متقنة", `${overview.skills.mastered} / ${overview.skills.total}`],
            ["تحتاج مراجعة", overview.skills.needsReview],
            ["أسئلة محلولة", overview.questionsAnswered],
            ["سلسلة الأيام", overview.streak.current],
          ].map(([label, value]) => (
            <article key={label as string} className="metric-card">
              <p className="text-sm font-semibold text-slate-500">{label}</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
            </article>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-black text-slate-950">تفصيل المهارات</h2>
        {skills && skills.length === 0 && (
          <div className="empty-state">لا توجد بيانات مهارات بعد — حل أول اختبار حتى تظهر هنا.</div>
        )}
        <div className="space-y-3">
          {skills?.map((s) => (
            <article key={s.skillId} className="surface flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="font-semibold text-slate-950">{s.name}</p>
                <p className="mt-1 text-xs text-slate-500">{s.reason || STATE_LABELS[s.state]}</p>
              </div>
              <span className="shrink-0 rounded-md bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {STATE_LABELS[s.state]}
              </span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
