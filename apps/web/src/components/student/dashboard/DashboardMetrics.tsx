import { CheckCircle2, Flame, NotebookPen, TrendingUp, type LucideIcon } from "lucide-react";
import styles from "./Dashboard.module.css";

export function DashboardMetrics({ skillCompletion, mastered, totalSkills, completedTasks, totalTasks, currentStreak, longestStreak, dueCount, mistakeCount }: { skillCompletion: number; mastered: number; totalSkills: number; completedTasks: number; totalTasks: number; currentStreak: number; longestStreak: number; dueCount: number; mistakeCount: number }) {
  const items = [
    { icon: TrendingUp, label: "إتقان المهارات", value: `${skillCompletion}%`, helper: `${mastered} من ${totalSkills}`, tone: "blue" },
    { icon: CheckCircle2, label: "مهام اليوم", value: completedTasks.toLocaleString("ar"), helper: `من ${totalTasks.toLocaleString("ar")} خطوات`, tone: "green" },
    { icon: Flame, label: "سلسلة التعلم", value: `${currentStreak} أيام`, helper: `الأطول ${longestStreak}`, tone: "amber" },
    { icon: NotebookPen, label: "مراجعات مستحقة", value: dueCount.toLocaleString("ar"), helper: `${mistakeCount.toLocaleString("ar")} في الدفتر`, tone: "coral" },
  ];
  return <section className={styles.metricGrid}>{items.map((item) => <Metric key={item.label} {...item} />)}</section>;
}

function Metric({ icon: Icon, label, value, helper, tone }: { icon: LucideIcon; label: string; value: string; helper: string; tone: string }) {
  return <article className={styles.metric}><span className={`${styles.metricIcon} ${styles[tone]}`}><Icon size={19} aria-hidden="true" /></span><div className={styles.metricContent}><p className={styles.metricLabel}>{label}</p><p className={styles.metricValue}>{value}</p><p className={styles.metricHelper}>{helper}</p></div></article>;
}

