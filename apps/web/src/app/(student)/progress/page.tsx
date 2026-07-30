"use client";

import { useEffect, useState } from "react";
import { BookOpenCheck, CircleHelp, Flame, ListChecks, TrendingUp } from "lucide-react";
import type { ProgressOverview, SkillProgress, SkillState } from "@alemedu/api-client";
import { api } from "@/lib/api";

const STATE_LABELS: Record<SkillState, string> = {
  mastered: "متقن",
  developing: "يتطور جيداً",
  needs_review: "جاهز للمراجعة",
  practicing: "قيد التدريب",
  introduced: "بدأت به",
  not_started: "لم تبدأ",
};

const STATE_STYLES: Record<SkillState, string> = {
  mastered: "bg-[#e9f8f6] text-[#13827d]",
  developing: "bg-[#edf3ff] text-[#244fc2]",
  needs_review: "bg-[#fff3ec] text-[#d45c4b]",
  practicing: "bg-[#f1edff] text-[#6b52c7]",
  introduced: "bg-[#fff4d8] text-[#9a6500]",
  not_started: "bg-slate-100 text-slate-500",
};

export default function ProgressPage() {
  const [overview, setOverview] = useState<ProgressOverview | null>(null);
  const [skills, setSkills] = useState<SkillProgress[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.progressOverview(), api.progressSkills()])
      .then(([nextOverview, nextSkills]) => {
        setOverview(nextOverview);
        setSkills(nextSkills);
      })
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب التقدم"));
  }, []);

  const completion =
    overview && overview.skills.total > 0
      ? Math.round((overview.skills.mastered / overview.skills.total) * 100)
      : 0;

  return (
    <div className="space-y-6 enter-up">
      <header>
        <p className="eyebrow">تقدمي</p>
        <h1 className="student-page-title mt-2">شاهد ما أصبح أسهل عليك</h1>
        <p className="student-page-copy">نقيس التقدم بالمهارات التي فهمتها وثبّتها، لا بعدد الصفحات التي فتحتها.</p>
      </header>

      {error && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <article className="rounded-lg bg-[#17243d] p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <span className="status-chip bg-white/10 text-white">
                <TrendingUp size={15} aria-hidden="true" />
                تقدم الرياضيات
              </span>
              <h2 className="mt-5 text-2xl font-black">كل مهارة تتقنها تقرّبك</h2>
              <p className="mt-2 text-sm leading-7 text-white/65">النسبة تتحدث بعد الاختبارات والمراجعات.</p>
            </div>
            <span className="text-5xl font-black text-[#8bb0ff]">{completion}%</span>
          </div>
          <div className="mt-8 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#6f98ff] transition-all duration-500" style={{ width: `${completion}%` }} />
          </div>
        </article>

        <aside className="surface p-6">
          <p className="text-sm font-black text-slate-950">ماذا تعني النسبة؟</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            ترتفع عندما تظهر إجاباتك أنك فهمت المهارة أكثر من مرة وفي أوقات مختلفة.
          </p>
          <div className="mt-5 flex items-start gap-2 rounded-lg bg-[#fff9e9] p-3 text-xs leading-6 text-[#795516]">
            <CircleHelp className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
            انخفاض النسبة مؤقتاً لا يعني تراجعك؛ قد يعني أن النظام اكتشف ما يحتاج تدريباً أدق.
          </div>
        </aside>
      </section>

      {overview && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: BookOpenCheck, label: "مهارات متقنة", value: `${overview.skills.mastered} / ${overview.skills.total}`, color: "bg-[#e9f8f6] text-[#13827d]" },
            { icon: TrendingUp, label: "جاهزة للمراجعة", value: overview.skills.needsReview, color: "bg-[#fff3ec] text-[#d45c4b]" },
            { icon: ListChecks, label: "أسئلة محلولة", value: overview.questionsAnswered, color: "bg-[#edf3ff] text-[#3568e8]" },
            { icon: Flame, label: "سلسلة الأيام", value: overview.streak.current, color: "bg-[#fff4d8] text-[#b97700]" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="metric-card flex items-center gap-4">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
                  <Icon size={21} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-500">{item.label}</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{item.value}</p>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-black text-slate-950">تفصيل المهارات</h2>
          <p className="mt-1 text-sm text-slate-500">لكل مهارة حالة واضحة وخطوة تالية.</p>
        </div>
        {skills && skills.length === 0 ? (
          <div className="empty-state">أكمل أول اختبار لتظهر خريطة مهاراتك هنا.</div>
        ) : (
          <div className="surface divide-y divide-[#edf0f5] overflow-hidden">
            {skills?.map((skill) => (
              <article key={skill.skillId} className="flex flex-wrap items-center justify-between gap-3 p-5 sm:px-6">
                <div>
                  <p className="font-black text-slate-950">{skill.name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{skill.reason || STATE_LABELS[skill.state]}</p>
                </div>
                <span className={`status-chip ${STATE_STYLES[skill.state]}`}>{STATE_LABELS[skill.state]}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
