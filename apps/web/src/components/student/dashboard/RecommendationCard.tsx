import Image from "next/image";
import Link from "next/link";
import type { DailyTask, MistakeItem } from "@alemedu/api-client";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { TASK_META } from "./constants";
import styles from "./Dashboard.module.css";

export function RecommendationCard({ dueMistakes, pendingTask, busy, onStart }: { dueMistakes: MistakeItem[]; pendingTask?: DailyTask; busy: boolean; onStart: (task: DailyTask) => void }) {
  const title = dueMistakes.length > 0 ? `راجع ${dueMistakes[0].skillName}` : pendingTask ? TASK_META[pendingTask.type]?.title || "أكمل مهمة اليوم" : "استكشف مادة جديدة";
  const text = dueMistakes.length > 0 ? `لديك ${dueMistakes.length} فرصة تحسن حان وقت مراجعتها.` : pendingTask ? "هذه هي الخطوة التالية في خطتك الحالية." : "أنجزت مهامك الحالية، ويمكنك متابعة خريطة المواد.";
  return <article className={`${styles.surface} ${styles.recommendation}`}><div className={styles.recommendationVisual}><Image src="/images/student-study-illustration.png" alt="" fill sizes="(max-width: 1180px) 45vw, 24vw" /></div><div className={styles.recommendationContent}><span className={styles.recommendationLabel}><Lightbulb size={16} aria-hidden="true" />توصية اليوم</span><h2 className={styles.recommendationTitle}>{title}</h2><p className={styles.recommendationText}>{text}</p>{dueMistakes.length > 0 ? <Link href="/review" className={styles.recommendationButton}>ابدأ المراجعة<ArrowLeft size={14} aria-hidden="true" /></Link> : pendingTask ? <button type="button" className={styles.recommendationButton} onClick={() => onStart(pendingTask)} disabled={busy}>ابدأ الخطوة التالية<ArrowLeft size={14} aria-hidden="true" /></button> : <Link href="/subjects" className={styles.recommendationButton}>عرض المواد<ArrowLeft size={14} aria-hidden="true" /></Link>}</div></article>;
}

