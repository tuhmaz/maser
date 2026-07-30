"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, Check, Eye, RefreshCcw, Sparkles, X } from "lucide-react";
import type { MistakeItem } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";

export default function ReviewPage() {
  const [queue, setQueue] = useState<MistakeItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);

  useEffect(() => {
    api
      .dueMistakes()
      .then(setQueue)
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب المراجعات المستحقة"));
  }, []);

  async function handleAnswer(mistakeId: string, correct: boolean) {
    setSubmittingId(mistakeId);
    try {
      await api.reviewMistake(mistakeId, correct);
      setQueue((current) => current?.filter((item) => item.id !== mistakeId) ?? null);
    } catch (err: any) {
      setError(err?.message ?? "تعذّر تسجيل المراجعة");
    } finally {
      setSubmittingId(null);
      setRevealedId(null);
    }
  }

  return (
    <div className="space-y-6 enter-up">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">المراجعة الذكية</p>
          <h1 className="student-page-title mt-2">فكرة واحدة في الوقت المناسب</h1>
          <p className="student-page-copy">حاول استرجاع الحل أولاً، ثم قيّم نفسك بصدق. هذا يساعد الذاكرة على التثبيت.</p>
        </div>
        <span className="status-chip bg-white text-slate-600 shadow-sm">
          <RefreshCcw size={15} className="text-[#3568e8]" aria-hidden="true" />
          {queue?.length ?? 0} للمراجعة
        </span>
      </header>

      <section className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="مراحل تثبيت المهارة">
        {["خطأ جديد", "مراجعة قريبة", "مراجعة لاحقة", "متقن"].map((step, index) => (
          <div key={step} className="flex min-w-max flex-1 items-center gap-2">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${index === 0 ? "bg-[#3568e8] text-white" : "bg-white text-slate-400"}`}>
              {index + 1}
            </span>
            <span className="text-xs font-bold text-slate-500">{step}</span>
            {index < 3 && <span className="h-px min-w-5 flex-1 bg-[#dfe5f0]" />}
          </div>
        ))}
      </section>

      {error && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}

      {queue && queue.length === 0 ? (
        <div className="surface flex min-h-72 flex-col items-center justify-center p-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#e9f8f6] text-[#13827d]">
            <Sparkles size={30} aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-xl font-black text-slate-950">لا توجد مراجعات الآن</h2>
          <p className="mt-2 max-w-md text-sm leading-7 text-slate-600">رائع، سنخبرك عندما يحين وقت تثبيت فكرة سابقة.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue?.map((item) => {
            const revealed = revealedId === item.id;
            return (
              <article key={item.id} className="surface overflow-hidden">
                <div className="flex items-center gap-3 border-b border-[#e7ebf3] bg-[#f9faff] p-4 sm:px-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f1edff] text-[#6b52c7]">
                    <BrainCircuit size={21} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-400">المهارة</p>
                    <p className="mt-1 text-sm font-black text-slate-800">{item.skillName}</p>
                  </div>
                </div>
                <div className="p-5 sm:p-6">
                  <p className="text-lg font-black leading-8 text-slate-950">{item.questionBody}</p>

                  {!revealed ? (
                    <div className="mt-6">
                      <p className="mb-3 text-sm text-slate-500">خذ لحظة وفكر في الحل قبل الكشف عن التقييم.</p>
                      <Button variant="secondary" onClick={() => setRevealedId(item.id)}>
                        <Eye size={17} aria-hidden="true" />
                        قيّم إجابتي
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-6 border-t border-[#edf0f5] pt-5">
                      <p className="mb-3 text-sm font-bold text-slate-700">هل وصلت إلى الإجابة الصحيحة هذه المرة؟</p>
                      <div className="flex flex-wrap gap-3">
                        <Button disabled={submittingId === item.id} onClick={() => handleAnswer(item.id, true)}>
                          <Check size={17} aria-hidden="true" />
                          نعم، فهمتها
                        </Button>
                        <Button variant="secondary" disabled={submittingId === item.id} onClick={() => handleAnswer(item.id, false)}>
                          <X size={17} aria-hidden="true" />
                          أحتاج محاولة أخرى
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
