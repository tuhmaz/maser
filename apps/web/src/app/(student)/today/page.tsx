"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  DailyPlan,
  DailyTask,
  ExplanationPayload,
  QuestionsPayload,
  ReviewPayload,
} from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";

// /today: خطة اليوم — docs/daily-plan-rules.md
// المكونات: مراجعة قصيرة → شرح/تذكير → أسئلة جديدة → سؤال من دفتر الأخطاء → اختبار تثبيت.
const TASK_LABELS: Record<string, string> = {
  short_review: "مراجعة قصيرة",
  explanation: "شرح مركز",
  new_questions: "أسئلة جديدة",
  mistake_question: "خطأ سابق",
  stabilization_test: "اختبار تثبيت",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "لم تبدأ",
  in_progress: "قيد التنفيذ",
  completed: "مكتملة",
};

export default function TodayPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<DailyPlan | null | undefined>(undefined); // undefined = جارٍ التحميل
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  function load() {
    api
      .getTodayPlan()
      .then((r) => setPlan(r.plan))
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب خطة اليوم"));
  }

  useEffect(load, []);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const p = await api.generateTodayPlan();
      setPlan(p);
    } catch (err: any) {
      setError(err?.message ?? "تعذّر توليد خطة اليوم");
    } finally {
      setGenerating(false);
    }
  }

  async function handleStart(task: DailyTask) {
    setBusyTaskId(task.id);
    setError(null);
    try {
      const result = await api.startDailyTask(task.id);
      if (result.kind === "attempt" && result.attempt) {
        router.push(`/quizzes/${result.attempt.attempt.id}`);
        return;
      }
      if (result.kind === "review") {
        router.push("/review");
        return;
      }
      // explanation: ابقَ في الصفحة، حدّث الحالة محليًا لعرض زر "أكملت"
      load();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر بدء المهمة");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleComplete(task: DailyTask) {
    setBusyTaskId(task.id);
    setError(null);
    try {
      await api.completeDailyTask(task.id);
      load();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر إكمال المهمة");
    } finally {
      setBusyTaskId(null);
    }
  }

  if (plan === undefined) {
    return <p className="empty-state">جارٍ تحميل خطة اليوم...</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">مهمتي اليوم</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">خطة قصيرة قابلة للإنجاز</h1>
        <p className="mt-2 max-w-2xl leading-7 text-slate-600">
          {plan ? `مصممة لتناسب حوالي ${plan.estimatedMinutes} دقيقة.` : "ابدأ يومك لتحصل على خطة مبنية على مستواك الحالي."}
        </p>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!plan && (
        <div className="surface flex flex-col items-center gap-4 p-8 text-center">
          <p className="text-slate-600">لا توجد خطة لهذا اليوم بعد.</p>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? "جارٍ التحضير..." : "ابدأ يومك"}
          </Button>
        </div>
      )}

      {plan && (
        <section className="surface p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-950">مسار جلسة اليوم</h2>
              <p className="mt-1 text-sm text-slate-500">{plan.tasks.length} مهمة اليوم.</p>
            </div>
          </div>

          {plan.tasks.length === 0 && (
            <p className="empty-state">لا مهام اليوم — يمكنك التنقل من موادك مباشرة.</p>
          )}

          <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {plan.tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                index={index + 1}
                task={task}
                busy={busyTaskId === task.id}
                onStart={() => handleStart(task)}
                onComplete={() => handleComplete(task)}
              />
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function TaskCard({
  index,
  task,
  busy,
  onStart,
  onComplete,
}: {
  index: number;
  task: DailyTask;
  busy: boolean;
  onStart: () => void;
  onComplete: () => void;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-sm font-black text-teal-700 shadow-sm">
          {index}
        </span>
        <span
          className={`rounded-md px-2 py-1 text-xs font-bold ${
            task.status === "completed"
              ? "bg-teal-100 text-teal-800"
              : task.status === "in_progress"
                ? "bg-amber-100 text-amber-900"
                : "bg-white text-slate-500"
          }`}
        >
          {STATUS_LABELS[task.status]}
        </span>
      </div>

      <p className="text-sm font-bold text-slate-950">{TASK_LABELS[task.type] ?? task.type}</p>
      <TaskDetail task={task} />

      {task.status !== "completed" && (
        <div className="mt-1 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onStart} disabled={busy}>
            {task.status === "in_progress" ? "متابعة" : "بدء"}
          </Button>
          {task.type !== "new_questions" && task.type !== "stabilization_test" && task.status === "in_progress" && (
            <Button className="flex-1" onClick={onComplete} disabled={busy}>
              تم
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

function TaskDetail({ task }: { task: DailyTask }) {
  switch (task.type) {
    case "explanation": {
      const p = task.payload as ExplanationPayload;
      return <p className="text-xs leading-5 text-slate-500">{p.skillName}: {p.reason}</p>;
    }
    case "short_review":
    case "mistake_question": {
      const p = task.payload as ReviewPayload;
      return <p className="text-xs text-slate-500">{p.mistakeIds.length} خطأ للمراجعة</p>;
    }
    case "new_questions":
    case "stabilization_test": {
      const p = task.payload as QuestionsPayload;
      return <p className="text-xs text-slate-500">{p.questionIds.length} سؤال</p>;
    }
    default:
      return null;
  }
}
