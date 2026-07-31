import type { DailyPlan, DailyTask } from "@alemedu/api-client";
import { Check, Clock3, ListChecks, Play, Sparkles, Target } from "lucide-react";
import { TASK_META } from "./constants";
import styles from "./Dashboard.module.css";

export function DailyPlanCard({ plan, loading, completedTasks, totalTasks, progress, generating, busyTaskId, onGenerate, onStart }: { plan: DailyPlan | null; loading: boolean; completedTasks: number; totalTasks: number; progress: number; generating: boolean; busyTaskId: string | null; onGenerate: () => void; onStart: (task: DailyTask) => void }) {
  return (
    <article className={styles.surface}>
      <div className={styles.panelHeader}><div><h2 className={styles.panelTitle}><ListChecks size={18} aria-hidden="true" />مهمتي اليوم</h2><p className={styles.panelCopy}>{plan ? `${completedTasks} من ${totalTasks} خطوات مكتملة` : "أنشئ خطة مبنية على تقدمك الحالي"}</p></div>{plan && <span className={styles.chip}><Clock3 size={13} aria-hidden="true" />{plan.estimatedMinutes} دقيقة</span>}</div>
      {loading && !plan ? <div className={styles.skeleton} /> : !plan ? (
        <div className={styles.emptyPlan}><span className={`${styles.taskIcon} ${styles.blue}`}><Target size={22} aria-hidden="true" /></span><h3>خطة اليوم لم تُنشأ بعد</h3><p>سيختار النظام مراجعة وتدريباً مناسبين وفق نتائجك الفعلية.</p><button type="button" className={styles.recommendationButton} onClick={onGenerate} disabled={generating}><Sparkles size={16} aria-hidden="true" />{generating ? "جارٍ إعداد الخطة..." : "إعداد مهمتي"}</button></div>
      ) : (
        <><div className={styles.taskList}>{plan.tasks.slice(0, 5).map((task) => <TaskItem key={task.id} task={task} minutes={Math.max(1, Math.round(plan.estimatedMinutes / Math.max(1, totalTasks)))} busy={busyTaskId === task.id} onStart={() => onStart(task)} />)}</div><div className={styles.planFooter}><div className={styles.progressMeta}><span>تقدم خطة اليوم</span><span>{progress}%</span></div><div className={styles.progressTrack}><span className={styles.progressFill} style={{ width: `${progress}%` }} /></div></div></>
      )}
    </article>
  );
}

function TaskItem({ task, minutes, busy, onStart }: { task: DailyTask; minutes: number; busy: boolean; onStart: () => void }) {
  const meta = TASK_META[task.type] ?? TASK_META.new_questions;
  const Icon = meta.icon;
  const completed = task.status === "completed";
  const skillName = "skillName" in task.payload ? task.payload.skillName : "";
  return <div className={styles.taskRow}><span className={`${styles.taskIcon} ${styles[completed ? "green" : meta.tone]}`}>{completed ? <Check size={17} aria-hidden="true" /> : <Icon size={17} aria-hidden="true" />}</span><div className={styles.taskContent}><p className={styles.taskTitle}>{meta.title}</p><p className={styles.taskMeta}>{skillName || (completed ? "اكتملت هذه الخطوة" : `${minutes} دقائق تقريباً`)}</p></div>{completed ? <span className={`${styles.chip} ${styles.green}`}>مكتملة</span> : <button type="button" className={styles.taskButton} onClick={onStart} disabled={busy}><Play size={12} fill="currentColor" aria-hidden="true" />{busy ? "يفتح..." : task.status === "in_progress" ? "متابعة" : "ابدأ"}</button>}</div>;
}

