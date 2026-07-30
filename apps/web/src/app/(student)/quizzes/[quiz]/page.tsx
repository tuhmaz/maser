"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { AnswerPayload, AttemptView, SanitizedQuestion } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";

// /quizzes/[quiz]: محرك الاختبار الفعلي — docs/daily-plan-rules.md (دورة تنفيذ الاختبار).
// المعامل [quiz] هنا هو معرّف المحاولة (attemptId) الناتج عن /diagnostic/start أو
// /quizzes/{quizId}/start؛ الصفحة تستأنف نفس المحاولة عبر GET /attempts/{attemptId}.
//
// القاعدة الحاكمة: لا تعتمد النتيجة على الواجهة أبدًا — الحساب النهائي والتصحيح
// يتمّان داخل الخادم فقط. هذه الصفحة لا "تعرف" الإجابة الصحيحة قبل التسليم.
export default function QuizPage() {
  const params = useParams<{ quiz: string }>();
  const router = useRouter();
  const attemptId = params.quiz;

  const [view, setView] = useState<AttemptView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<Record<string, AnswerPayload>>({});
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    api
      .getAttempt(attemptId)
      .then((v) => {
        if (cancelled) return;
        if (v.attempt.status === "submitted") {
          router.replace(`/results/${attemptId}`);
          return;
        }
        setView(v);
        setSavedIds(new Set(v.questions.filter((q) => q.answered).map((q) => q.id)));
      })
      .catch((err: any) => setError(err?.message ?? "تعذّر تحميل الاختبار"));
    return () => {
      cancelled = true;
    };
  }, [attemptId, router]);

  const answeredCount = savedIds.size;
  const totalCount = view?.questions.length ?? 0;

  async function persistAnswer(questionId: string, answer: AnswerPayload) {
    setSavingIds((prev) => new Set(prev).add(questionId));
    try {
      await api.saveAnswer(attemptId, {
        questionId,
        answer,
        timeSpentMs: Date.now() - startedAt,
      });
      setSavedIds((prev) => new Set(prev).add(questionId));
    } catch (err: any) {
      setError(err?.message ?? "تعذّر حفظ الإجابة");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    }
  }

  function setAndSave(questionId: string, answer: AnswerPayload) {
    setDraft((prev) => ({ ...prev, [questionId]: answer }));
    void persistAnswer(questionId, answer);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.submitAttempt(attemptId);
      router.push(`/results/${attemptId}`);
    } catch (err: any) {
      setError(err?.message ?? "تعذّر تسليم الاختبار");
      setSubmitting(false);
    }
  }

  if (error && !view) {
    return <p className="empty-state">{error}</p>;
  }
  if (!view) {
    return <p className="empty-state">جارٍ تحميل الاختبار...</p>;
  }

  return (
    <div className="space-y-6">
      <header className="surface flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="eyebrow">الاختبار</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">جلسة اختبار محفوظة</h1>
        </div>
        <p className="text-sm font-semibold text-slate-500">
          {answeredCount} من {totalCount} مُجاب
        </p>
      </header>

      <div className="space-y-4">
        {view.questions.map((q, idx) => (
          <QuestionCard
            key={q.id}
            index={idx + 1}
            question={q}
            saving={savingIds.has(q.id)}
            saved={savedIds.has(q.id)}
            value={draft[q.id]}
            onAnswer={(answer) => setAndSave(q.id, answer)}
          />
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="surface flex flex-col items-center gap-3 p-6 text-center">
        <p className="text-sm text-slate-500">
          يمكنك تسليم الاختبار متى شئت — الأسئلة غير المُجابة تُحسب ضمن الإجمالي.
        </p>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "جارٍ التسليم..." : "تسليم الاختبار"}
        </Button>
      </div>
    </div>
  );
}

function QuestionCard({
  index,
  question,
  saving,
  saved,
  value,
  onAnswer,
}: {
  index: number;
  question: SanitizedQuestion;
  saving: boolean;
  saved: boolean;
  value: AnswerPayload | undefined;
  onAnswer: (answer: AnswerPayload) => void;
}) {
  return (
    <article className="surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold text-slate-950">
          {index}. {question.body}
        </p>
        <StatusBadge saving={saving} saved={saved} />
      </div>

      <div className="mt-4">
        <QuestionInput question={question} value={value} onAnswer={onAnswer} />
      </div>
    </article>
  );
}

function StatusBadge({ saving, saved }: { saving: boolean; saved: boolean }) {
  if (saving) return <span className="shrink-0 text-xs font-semibold text-slate-400">جارٍ الحفظ...</span>;
  if (saved) return <span className="shrink-0 text-xs font-semibold text-teal-700">✓ محفوظة</span>;
  return null;
}

function QuestionInput({
  question,
  value,
  onAnswer,
}: {
  question: SanitizedQuestion;
  value: AnswerPayload | undefined;
  onAnswer: (answer: AnswerPayload) => void;
}) {
  switch (question.type) {
    case "single_choice":
    case "true_false": {
      const selected = value && "optionId" in value ? value.optionId : undefined;
      return (
        <div className="flex flex-col gap-2">
          {question.options?.map((opt) => (
            <label
              key={opt.id}
              className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm font-semibold transition ${
                selected === opt.id ? "border-teal-700 bg-teal-50 text-teal-900" : "border-slate-200 hover:border-teal-300"
              }`}
            >
              <input
                type="radio"
                name={question.id}
                className="accent-teal-700"
                checked={selected === opt.id}
                onChange={() => onAnswer({ optionId: opt.id })}
              />
              {opt.text}
            </label>
          ))}
        </div>
      );
    }

    case "multi_select": {
      const chosen = value && "optionIds" in value ? value.optionIds : [];
      return (
        <div className="flex flex-col gap-2">
          {question.options?.map((opt) => {
            const checked = chosen.includes(opt.id);
            return (
              <label
                key={opt.id}
                className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm font-semibold transition ${
                  checked ? "border-teal-700 bg-teal-50 text-teal-900" : "border-slate-200 hover:border-teal-300"
                }`}
              >
                <input
                  type="checkbox"
                  className="accent-teal-700"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...chosen, opt.id]
                      : chosen.filter((id) => id !== opt.id);
                    onAnswer({ optionIds: next });
                  }}
                />
                {opt.text}
              </label>
            );
          })}
        </div>
      );
    }

    case "numeric_input": {
      const numValue = value && "value" in value ? value.value : "";
      return (
        <input
          type="number"
          inputMode="decimal"
          className="w-full max-w-xs rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold"
          placeholder="اكتب الإجابة"
          defaultValue={numValue}
          onBlur={(e) => {
            const n = Number(e.target.value);
            if (!Number.isNaN(n) && e.target.value !== "") onAnswer({ value: n });
          }}
        />
      );
    }

    case "ordering":
      return <OrderingInput question={question} value={value} onAnswer={onAnswer} />;

    default:
      return <p className="text-sm text-slate-500">هذا النوع من الأسئلة غير مدعوم بعد في الواجهة.</p>;
  }
}

function OrderingInput({
  question,
  value,
  onAnswer,
}: {
  question: SanitizedQuestion;
  value: AnswerPayload | undefined;
  onAnswer: (answer: AnswerPayload) => void;
}) {
  const initialOrder = useMemo(() => (question.options ?? []).map((o) => o.id), [question.options]);
  const current = value && "orderedOptionIds" in value ? value.orderedOptionIds : initialOrder;
  const byId = useMemo(() => {
    const map: Record<string, string> = {};
    question.options?.forEach((o) => (map[o.id] = o.text));
    return map;
  }, [question.options]);

  function move(idx: number, dir: -1 | 1) {
    const next = [...current];
    const swapWith = idx + dir;
    if (swapWith < 0 || swapWith >= next.length) return;
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    onAnswer({ orderedOptionIds: next });
  }

  return (
    <ol className="flex flex-col gap-2">
      {current.map((id, idx) => (
        <li key={id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold">
          <span>{idx + 1}. {byId[id]}</span>
          <span className="flex gap-1">
            <button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={() => move(idx, -1)} disabled={idx === 0}>
              ↑
            </button>
            <button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={() => move(idx, 1)} disabled={idx === current.length - 1}>
              ↓
            </button>
          </span>
        </li>
      ))}
    </ol>
  );
}
