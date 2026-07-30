"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ListChecks, RefreshCcw, Sparkles, Target } from "lucide-react";
import type { AttemptResult, SkillState } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";

// /results/[attempt]: تقرير النتيجة — docs/mastery-model.md
// (متقن / جيد / يحتاج مراجعة / يحتاج تأسيس، مع تفسير مفهوم لكل مهارة وليس رقمًا فقط)
const STATE_LABELS: Record<SkillState, string> = {
  mastered: "متقن",
  developing: "جيد",
  needs_review: "يحتاج مراجعة",
  practicing: "يحتاج تأسيس",
  introduced: "يحتاج تأسيس",
  not_started: "يحتاج تأسيس",
};

const STATE_STYLES: Record<SkillState, string> = {
  mastered: "bg-[#e9f8f6] text-[#13827d]",
  developing: "bg-[#edf3ff] text-[#244fc2]",
  needs_review: "bg-[#fff3ec] text-[#d45c4b]",
  practicing: "bg-[#f1edff] text-[#6b52c7]",
  introduced: "bg-[#fff4d8] text-[#9a6500]",
  not_started: "bg-slate-100 text-slate-500",
};

export default function ResultPage() {
  const params = useParams<{ attempt: string }>();
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getAttemptResult(params.attempt)
      .then(setResult)
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب النتيجة"));
  }, [params.attempt]);

  if (error) return <p className="empty-state">{error}</p>;
  if (!result) return <p className="empty-state">جارٍ تحميل النتيجة...</p>;

  const scoreRounded = Math.round(result.score);

  return (
    <div className="space-y-6 enter-up">
      <header>
        <p className="eyebrow">النتيجة</p>
        <h1 className="student-page-title mt-2">هذه نقطة بداية، وليست حكماً عليك</h1>
        <p className="student-page-copy">نستخدم إجاباتك لاختيار ما تتعلمه بعد ذلك وتحديد ما يحتاج تثبيتاً.</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)]">
        <div className="rounded-lg bg-[#3568e8] p-6 text-white sm:p-8">
          <span className="status-chip bg-white/15 text-white">
            <Sparkles size={15} aria-hidden="true" />
            اكتملت الجلسة
          </span>
          <div className="mt-6 flex items-end gap-2">
            <p className="text-6xl font-black">{scoreRounded}</p>
            <span className="pb-1 text-xl font-black text-white/65">%</span>
          </div>
          <p className="mt-3 text-sm leading-7 text-white/75">هذه النسبة تساعد النظام على بناء خطتك، وليست درجة مدرسية.</p>
        </div>
        <div className="surface p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#e9f8f6] text-[#13827d]">
            <ListChecks size={22} aria-hidden="true" />
          </span>
          <p className="mt-4 text-sm font-bold text-slate-500">إجابات وصلت إليها</p>
          <p className="mt-1 text-3xl font-black text-slate-950">
            {result.correctCount} <span className="text-base text-slate-400">من {result.totalCount}</span>
          </p>
          <p className="mt-3 text-xs leading-6 text-slate-500">سنراجع الباقي معك في مهام قصيرة لاحقاً.</p>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">ماذا عرفنا عن مهاراتك؟</h2>
          <p className="mt-1 text-sm text-slate-500">لكل مهارة وصف وخطوة تالية.</p>
        </div>
        {result.skillBreakdown.length === 0 && (
          <p className="empty-state">لم تُربط أسئلة هذا الاختبار بمهارات بعد.</p>
        )}
        <div className="surface divide-y divide-[#edf0f5] overflow-hidden">
          {result.skillBreakdown.map((s) => (
            <article key={s.skillId} className="p-5 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-black text-slate-950">{s.skillName}</p>
                <span className={`status-chip ${STATE_STYLES[s.newState]}`}>
                  {STATE_LABELS[s.newState]}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{s.reason}</p>
              <p className="mt-1 text-xs text-slate-400">
                {s.correct} من {s.total} صحيحة في هذا الاختبار
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/today">
          <Button>
            <Target size={17} aria-hidden="true" />
            افتح مهمتي اليوم
            <ArrowLeft size={17} aria-hidden="true" />
          </Button>
        </Link>
        <Link href="/mistakes">
          <Button variant="secondary">
            <RefreshCcw size={17} aria-hidden="true" />
            فرص التحسن
          </Button>
        </Link>
      </div>
    </div>
  );
}
