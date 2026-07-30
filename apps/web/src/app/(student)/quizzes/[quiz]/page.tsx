"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, Sparkles } from "lucide-react";
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
  const [currentIndex, setCurrentIndex] = useState(0);

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
  const progress = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

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
    <div className="mx-auto max-w-3xl space-y-5 enter-up">
      <header className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:px-6">
          <div>
            <p className="eyebrow">تحديد المستوى</p>
            <h1 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">خذ كل سؤال على حدة</h1>
          </div>
          <span className="status-chip bg-[#edf3ff] text-[#244fc2]">
            <Clock3 size={15} aria-hidden="true" />
            يُحفظ تلقائياً
          </span>
        </div>
        <div className="border-t border-[#edf0f5] bg-[#f9faff] px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>أجبت عن {answeredCount} من {totalCount}</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      {view.questions[currentIndex] && (
        <div>
          <QuestionCard
            key={view.questions[currentIndex].id}
            index={currentIndex + 1}
            total={totalCount}
            question={view.questions[currentIndex]}
            saving={savingIds.has(view.questions[currentIndex].id)}
            saved={savedIds.has(view.questions[currentIndex].id)}
            value={draft[view.questions[currentIndex].id]}
            onAnswer={(answer) => setAndSave(view.questions[currentIndex].id, answer)}
          />
        </div>
      )}

      {error && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="secondary"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
        >
          <ArrowRight size={17} aria-hidden="true" />
          السابق
        </Button>
        {currentIndex < totalCount - 1 ? (
          <Button onClick={() => setCurrentIndex((index) => Math.min(totalCount - 1, index + 1))}>
            التالي
            <ArrowLeft size={17} aria-hidden="true" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            <CheckCircle2 size={18} aria-hidden="true" />
            {submitting ? "جارٍ التسليم..." : "إنهاء الاختبار"}
          </Button>
        )}
      </div>
      <p className="text-center text-xs leading-6 text-slate-500">
        لا بأس إن لم تعرف الإجابة. الاختبار يساعدنا في اختيار نقطة البداية فقط.
      </p>
    </div>
  );
}

function QuestionCard({
  index,
  total,
  question,
  saving,
  saved,
  value,
  onAnswer,
}: {
  index: number;
  total: number;
  question: SanitizedQuestion;
  saving: boolean;
  saved: boolean;
  value: AnswerPayload | undefined;
  onAnswer: (answer: AnswerPayload) => void;
}) {
  return (
    <article className="surface overflow-hidden">
      <div className="border-b border-[#edf0f5] bg-[#f9faff] px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-black text-[#3568e8]">السؤال {index} من {total}</span>
          <StatusBadge saving={saving} saved={saved} />
        </div>
      </div>
      <div className="p-5 sm:p-7">
        <p className="text-lg font-black leading-8 text-slate-950 sm:text-xl">
          {question.body}
        </p>

        <div className="mt-6">
          <QuestionInput question={question} value={value} onAnswer={onAnswer} />
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ saving, saved }: { saving: boolean; saved: boolean }) {
  if (saving) return <span className="shrink-0 text-xs font-semibold text-slate-400">جارٍ الحفظ...</span>;
  if (saved) return <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-[#13827d]"><Check size={14} aria-hidden="true" /> محفوظة</span>;
  return <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-400"><Sparkles size={13} aria-hidden="true" /> اختر إجابتك</span>;
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
              className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-bold transition ${
                selected === opt.id ? "border-[#3568e8] bg-[#edf3ff] text-[#244fc2]" : "border-[#dfe5f0] bg-white text-slate-700 hover:border-[#b8c8ef]"
              }`}
            >
              <input
                type="radio"
                name={question.id}
                className="h-4 w-4 accent-[#3568e8]"
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
                className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-bold transition ${
                  checked ? "border-[#3568e8] bg-[#edf3ff] text-[#244fc2]" : "border-[#dfe5f0] bg-white text-slate-700 hover:border-[#b8c8ef]"
                }`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#3568e8]"
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
          className="w-full max-w-xs"
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
        <li key={id} className="flex items-center justify-between gap-3 rounded-lg border border-[#dfe5f0] px-4 py-3 text-sm font-bold">
          <span>{idx + 1}. {byId[id]}</span>
          <span className="flex gap-1">
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe5f0] text-xs" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="تحريك لأعلى">
              ↑
            </button>
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe5f0] text-xs" onClick={() => move(idx, 1)} disabled={idx === current.length - 1} aria-label="تحريك لأسفل">
              ↓
            </button>
          </span>
        </li>
      ))}
    </ol>
  );
}
