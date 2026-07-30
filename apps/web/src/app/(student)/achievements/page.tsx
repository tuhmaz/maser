"use client";

import { useEffect, useState } from "react";
import { Award, BrainCircuit, CheckCircle2, LockKeyhole, RefreshCcw, Sparkles, Target, Flame, type LucideIcon } from "lucide-react";
import type { Achievement } from "@alemedu/api-client";
import { api } from "@/lib/api";

// إنجازات حقيقية من GET /achievements — docs/daily-plan-rules.md §نظام الإنجازات:
// لا تعوّض التعلم، لا مقارنة بين الطلاب، ويمكن تعطيل المؤثرات البصرية
// عبر feature flag "achievements_visual_effects" (تُحترَم فعليًا هنا، لا عرض ثابت).
const ICONS: Record<string, LucideIcon> = {
  first_quiz: BrainCircuit,
  first_task: CheckCircle2,
  first_mistake_reviewed: RefreshCcw,
  first_skill_mastered: Target,
  streak_3: Flame,
  streak_7: Flame,
  streak_30: Flame,
};
const COLORS = ["bg-[#edf3ff] text-[#3568e8]", "bg-[#e9f8f6] text-[#13827d]", "bg-[#fff4d8] text-[#b97700]", "bg-[#f1edff] text-[#6b52c7]"];

export default function AchievementsPage() {
  const [items, setItems] = useState<Achievement[] | null>(null);
  const [effectsEnabled, setEffectsEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listAchievements().then(setItems).catch((err: any) => setError(err?.message ?? "تعذّر جلب الإنجازات"));
    api.getFeatureFlags().then((flags) => setEffectsEnabled(flags.achievements_visual_effects ?? true)).catch(() => {});
  }, []);

  const earnedCount = items?.filter((a) => a.earned).length ?? 0;
  const nextGoal = items?.find((a) => !a.earned);

  return (
    <div className={`space-y-6 ${effectsEnabled ? "enter-up" : ""}`}>
      <header>
        <p className="eyebrow">إنجازاتي</p>
        <h1 className="student-page-title mt-2">نحتفل بالجهد الذي يصنع التقدم</h1>
        <p className="student-page-copy">إنجازات شخصية مرتبطة بالتعلم الحقيقي، بلا مقارنة أو ترتيب بين الطلاب.</p>
      </header>

      {error && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}

      <section className="rounded-lg bg-[#17243d] p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <span className="status-chip bg-white/10 text-white">
              <Sparkles size={15} aria-hidden="true" />
              {earnedCount} من {items?.length ?? 0} إنجازًا
            </span>
            <h2 className="mt-4 text-2xl font-black">
              {nextGoal ? nextGoal.title : "أتممت كل الإنجازات المتاحة!"}
            </h2>
            <p className="mt-2 text-sm leading-7 text-white/65">
              {nextGoal ? nextGoal.description || "خطوة أخرى وتفتحه." : "أحسنت — تابع رحلتك لتظهر إنجازات جديدة لاحقًا."}
            </p>
          </div>
          <span className="flex h-20 w-20 items-center justify-center rounded-lg bg-[#f4b942] text-[#503400]">
            <Award size={40} aria-hidden="true" />
          </span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {items?.map((a) => {
          const Icon = ICONS[a.key] ?? Award;
          const color = COLORS[a.key.length % COLORS.length];
          return (
            <article key={a.key} className={`surface p-6 ${!a.earned && "opacity-70"}`}>
              <div className="flex items-start justify-between">
                <span className={`flex h-12 w-12 items-center justify-center rounded-lg ${color}`}>
                  <Icon size={24} aria-hidden="true" />
                </span>
                {a.earned ? (
                  <CheckCircle2 className="text-teal-600" size={18} aria-label="تم" />
                ) : (
                  <LockKeyhole className="text-slate-300" size={18} aria-label="لم يفتح بعد" />
                )}
              </div>
              <h2 className="mt-5 font-black text-slate-950">{a.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{a.description}</p>
              {effectsEnabled && (
                <div className="mt-5 progress-track">
                  <div className={`progress-fill ${a.earned ? "w-full" : "w-0"}`} />
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
