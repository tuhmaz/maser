"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpenText,
  BrainCircuit,
  Check,
  CheckCircle2,
  Clock3,
  ListChecks,
  Play,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import type {
  DailyPlan,
  DailyTask,
  ExplanationPayload,
  QuestionsPayload,
  ReviewPayload,
} from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";

const TASK_META: Record<string, { label: string; helper: string; icon: LucideIcon; color: string }> = {
  short_review: {
    label: "تهيئة سريعة",
    helper: "نسترجع فكرة سابقة قبل البدء",
    icon: RefreshCcw,
    color: "bg-[#e9f8f6] text-[#13827d]",
  },
  explanation: {
    label: "فكرة اليوم",
    helper: "شرح مركز بلغة واضحة",
    icon: BookOpenText,
    color: "bg-[#edf3ff] text-[#3568e8]",
  },
  new_questions: {
    label: "تدريب موجه",
    helper: "أسئلة تناسب مستواك الحالي",
    icon: ListChecks,
    color: "bg-[#f1edff] text-[#6b52c7]",
  },
  mistake_question: {
    label: "فرصة للتحسن",
    helper: "نعود لفكرة احتاجت تثبيتاً",
    icon: BrainCircuit,
    color: "bg-[#fff3ec] text-[#d45c4b]",
  },
  stabilization_test: {
    label: "تأكد من فهمك",
    helper: "خطوة أخيرة لتثبيت المهارة",
    icon: ShieldCheck,
    color: "bg-[#fff4d8] text-[#b97700]",
  },
};

export default function TodayPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<DailyPlan | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  function load() {
    api
      .getTodayPlan()
      .then((response) => setPlan(response.plan))
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب خطة اليوم"));
  }

  useEffect(load, []);

  const completedCount = useMemo(
    () => plan?.tasks.filter((task) => task.status === "completed").length ?? 0,
    [plan],
  );
  const progress = plan?.tasks.length ? Math.round((completedCount / plan.tasks.length) * 100) : 0;

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      setPlan(await api.generateTodayPlan());
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
    return (
      <div className="surface flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-lg bg-[#edf3ff] text-[#3568e8]">
          <Sparkles size={24} aria-hidden="true" />
        </span>
        <p className="font-bold text-slate-700">نجهز مهمتك المناسبة...</p>
        <p className="text-sm text-slate-500">لحظات وتظهر خطوات اليوم.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 enter-up">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">مهمتي اليوم</p>
          <h1 className="student-page-title mt-2">خطوات قليلة، تقدم حقيقي</h1>
          <p className="student-page-copy">
            {plan
              ? `جلسة مصممة لتناسب نحو ${plan.estimatedMinutes} دقيقة. خذ كل خطوة على حدة.`
              : "ابدأ يومك لنرتب لك جلسة مبنية على مستواك الحالي."}
          </p>
        </div>
        {plan && (
          <span className="status-chip bg-white text-slate-600 shadow-sm">
            <Clock3 size={15} className="text-[#3568e8]" aria-hidden="true" />
            {plan.estimatedMinutes} دقيقة
          </span>
        )}
      </header>

      {error && (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </p>
      )}

      {!plan && (
        <section className="surface flex min-h-80 flex-col items-center justify-center p-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#edf3ff] text-[#3568e8]">
            <Target size={30} aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-xl font-black text-slate-950">مهمتك الأولى جاهزة للتحضير</h2>
          <p className="mt-2 max-w-md text-sm leading-7 text-slate-600">
            سنختار مراجعة قصيرة وتدريباً مناسباً لك. لا تحتاج لاختيار الدرس بنفسك.
          </p>
          <Button onClick={handleGenerate} disabled={generating} className="mt-6">
            <Sparkles size={18} aria-hidden="true" />
            {generating ? "نجهز المهمة..." : "حضّر مهمتي"}
          </Button>
        </section>
      )}

      {plan && (
        <section className="surface overflow-hidden">
          <div className="border-b border-[#e7ebf3] bg-[#f9faff] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-950">مسار جلسة اليوم</h2>
                <p className="mt-1 text-sm text-slate-500">
                  أنجزت {completedCount} من {plan.tasks.length} خطوات
                </p>
              </div>
              <span className="text-2xl font-black text-[#3568e8]">{progress}%</span>
            </div>
            <div className="mt-4 progress-track" aria-label={`نسبة الإنجاز ${progress}%`}>
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {plan.tasks.length === 0 ? (
            <div className="m-5 empty-state">أنجزت كل ما عليك اليوم. يمكنك استكشاف موادك أو العودة غداً.</div>
          ) : (
            <ol>
              {plan.tasks.map((task, index) => (
                <TaskRow
                  key={task.id}
                  index={index + 1}
                  task={task}
                  busy={busyTaskId === task.id}
                  onStart={() => handleStart(task)}
                  onComplete={() => handleComplete(task)}
                />
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}

function TaskRow({
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
  const meta = TASK_META[task.type] ?? {
    label: task.type,
    helper: "خطوة في جلسة اليوم",
    icon: Target,
    color: "bg-slate-100 text-slate-600",
  };
  const Icon = meta.icon;
  const completed = task.status === "completed";
  const active = task.status === "in_progress";

  return (
    <li className={`relative flex gap-4 border-b border-[#edf0f5] p-5 last:border-b-0 sm:p-6 ${active ? "bg-[#f7f9ff]" : ""}`}>
      <div className="relative flex shrink-0 flex-col items-center">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-lg ${
            completed ? "bg-[#149c96] text-white" : meta.color
          }`}
        >
          {completed ? <Check size={22} strokeWidth={3} aria-hidden="true" /> : <Icon size={22} aria-hidden="true" />}
        </span>
      </div>

      <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-slate-400">الخطوة {index}</span>
            {active && <span className="status-chip bg-[#edf3ff] text-[#244fc2]">تعمل عليها الآن</span>}
            {completed && <span className="status-chip bg-[#e9f8f6] text-[#13827d]">مكتملة</span>}
          </div>
          <h3 className={`mt-1 font-black ${completed ? "text-slate-500" : "text-slate-950"}`}>{meta.label}</h3>
          <p className="mt-1 text-xs leading-6 text-slate-500">
            {meta.helper}
            <TaskDetail task={task} />
          </p>
        </div>

        {!completed && (
          <div className="mt-4 flex shrink-0 gap-2 sm:mt-0">
            <Button variant={active ? "primary" : "secondary"} onClick={onStart} disabled={busy}>
              <Play size={16} fill={active ? "currentColor" : "none"} aria-hidden="true" />
              {active ? "متابعة" : "ابدأ"}
            </Button>
            {task.type !== "new_questions" && task.type !== "stabilization_test" && active && (
              <Button variant="secondary" onClick={onComplete} disabled={busy} aria-label={`إكمال ${meta.label}`}>
                <CheckCircle2 size={17} aria-hidden="true" />
                أكملت
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function TaskDetail({ task }: { task: DailyTask }) {
  switch (task.type) {
    case "explanation": {
      const payload = task.payload as ExplanationPayload;
      return <span> · {payload.skillName}: {payload.reason}</span>;
    }
    case "short_review":
    case "mistake_question": {
      const payload = task.payload as ReviewPayload;
      return <span> · {payload.mistakeIds.length} فرصة للمراجعة</span>;
    }
    case "new_questions":
    case "stabilization_test": {
      const payload = task.payload as QuestionsPayload;
      return <span> · {payload.questionIds.length} أسئلة</span>;
    }
    default:
      return null;
  }
}
