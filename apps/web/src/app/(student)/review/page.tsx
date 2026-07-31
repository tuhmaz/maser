"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, CheckCircle2, RefreshCcw, Sparkles, XCircle } from "lucide-react";
import type { AnswerPayload, MistakeItem } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";

type Feedback = { correct: boolean } | null;

export default function ReviewPage() {
  const [queue, setQueue] = useState<MistakeItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [selection, setSelection] = useState<Record<string, string[]>>({});
  const [numericValue, setNumericValue] = useState<Record<string, string>>({});

  useEffect(() => {
    api
      .dueMistakes()
      .then(setQueue)
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب المراجعات المستحقة"));
  }, []);

  function toggleOption(mistakeId: string, optionId: string, multi: boolean) {
    setSelection((current) => {
      const chosen = current[mistakeId] ?? [];
      if (multi) {
        const next = chosen.includes(optionId) ? chosen.filter((id) => id !== optionId) : [...chosen, optionId];
        return { ...current, [mistakeId]: next };
      }
      return { ...current, [mistakeId]: [optionId] };
    });
  }

  function buildAnswer(item: MistakeItem): AnswerPayload | null {
    const question = item.question;
    if (!question) return null;
    const chosen = selection[item.id] ?? [];
    switch (question.type) {
      case "single_choice":
      case "true_false":
        return chosen[0] ? { optionId: chosen[0] } : null;
      case "multi_select":
        return chosen.length > 0 ? { optionIds: chosen } : null;
      case "numeric_input": {
        const raw = numericValue[item.id];
        if (raw === undefined || raw.trim() === "") return null;
        const value = Number(raw);
        return Number.isNaN(value) ? null : { value };
      }
      default:
        return null; // ordering/matching: غير مدعومة في هذه الشاشة بعد
    }
  }

  async function submitAnswer(item: MistakeItem) {
    const answer = buildAnswer(item);
    if (!answer) return;

    setSubmittingId(item.id);
    setError(null);
    try {
      const result = await api.reviewMistake(item.id, answer);
      setFeedback((current) => ({ ...current, [item.id]: { correct: result.correct } }));
      // إبقاء البطاقة ظاهرة لحظة مع نتيجة التصحيح، ثم إزالتها من القائمة
      setTimeout(() => {
        setQueue((current) => current?.filter((q) => q.id !== item.id) ?? null);
      }, 1400);
    } catch (err: any) {
      setError(err?.message ?? "تعذّر تسجيل المراجعة");
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="space-y-6 enter-up">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">المراجعة الذكية</p>
          <h1 className="student-page-title mt-2">فكرة واحدة في الوقت المناسب</h1>
          <p className="student-page-copy">أجب فعليًا عن السؤال — التصحيح يتم داخل الخادم مثل أي اختبار.</p>
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
            const result = feedback[item.id];
            const question = item.question;
            const chosen = selection[item.id] ?? [];
            const answer = buildAnswer(item);
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

                  {result ? (
                    <div className={`mt-6 flex items-center gap-3 rounded-lg p-4 ${result.correct ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                      {result.correct ? <CheckCircle2 size={22} aria-hidden="true" /> : <XCircle size={22} aria-hidden="true" />}
                      <p className="text-sm font-black">{result.correct ? "إجابة صحيحة — أحسنت!" : "ليست صحيحة هذه المرة، ستعود للمراجعة قريبًا."}</p>
                    </div>
                  ) : !question || (question.type !== "single_choice" && question.type !== "true_false" && question.type !== "multi_select" && question.type !== "numeric_input") ? (
                    <p className="mt-6 text-sm text-slate-500">هذا النوع من الأسئلة غير مدعوم للمراجعة التفاعلية بعد.</p>
                  ) : (
                    <div className="mt-6 space-y-4">
                      {question.type === "numeric_input" ? (
                        <input
                          type="number"
                          inputMode="decimal"
                          className="w-full max-w-xs"
                          placeholder="أدخل الناتج"
                          value={numericValue[item.id] ?? ""}
                          onChange={(event) => setNumericValue((current) => ({ ...current, [item.id]: event.target.value }))}
                        />
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {question.options?.map((opt) => {
                            const active = chosen.includes(opt.id);
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => toggleOption(item.id, opt.id, question.type === "multi_select")}
                                className={`rounded-lg border p-3 text-right text-sm font-bold transition ${
                                  active ? "border-[#3568e8] bg-[#eef3ff] text-[#1a3fae]" : "border-[#e3e8f2] text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                {opt.text}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <Button disabled={!answer || submittingId === item.id} onClick={() => void submitAnswer(item)}>
                        {submittingId === item.id ? "جارٍ التصحيح..." : "تحقق من إجابتي"}
                      </Button>
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
