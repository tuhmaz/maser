"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  mastered: "bg-teal-50 text-teal-800 border-teal-200",
  developing: "bg-amber-50 text-amber-800 border-amber-200",
  needs_review: "bg-red-50 text-red-700 border-red-200",
  practicing: "bg-slate-100 text-slate-600 border-slate-200",
  introduced: "bg-slate-100 text-slate-600 border-slate-200",
  not_started: "bg-slate-100 text-slate-600 border-slate-200",
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
    <div className="space-y-6">
      <header>
        <p className="eyebrow">النتيجة</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">تقرير مفهوم وليس رقمًا فقط</h1>
      </header>

      <div className="surface flex flex-wrap items-center justify-between gap-6 p-6 sm:p-8">
        <div>
          <p className="text-sm font-semibold text-slate-500">نتيجتك</p>
          <p className="mt-1 text-5xl font-black text-slate-950">{scoreRounded}%</p>
        </div>
        <div className="text-sm text-slate-600">
          <p>
            <span className="font-bold text-slate-950">{result.correctCount}</span> إجابة صحيحة من أصل{" "}
            <span className="font-bold text-slate-950">{result.totalCount}</span>
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-black text-slate-950">تفصيل المهارات</h2>
        {result.skillBreakdown.length === 0 && (
          <p className="empty-state">لم تُربط أسئلة هذا الاختبار بمهارات بعد.</p>
        )}
        <div className="space-y-3">
          {result.skillBreakdown.map((s) => (
            <article key={s.skillId} className="surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-bold text-slate-950">{s.skillName}</p>
                <span className={`rounded-md border px-3 py-1 text-xs font-bold ${STATE_STYLES[s.newState]}`}>
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
          <Button>الذهاب إلى مهمتي اليوم</Button>
        </Link>
        <Link href="/mistakes">
          <Button variant="secondary">مراجعة دفتر الأخطاء</Button>
        </Link>
      </div>
    </div>
  );
}
