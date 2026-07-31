import Link from "next/link";
import type { Achievement, DailyTask, MistakeItem } from "@alemedu/api-client";
import { ArrowLeft, Award, NotebookPen, Target, type LucideIcon } from "lucide-react";
import { TASK_META } from "./constants";
import styles from "./Dashboard.module.css";

export default function DashboardPanels({ mistakes, achievement, pendingTask, mistakesDueNow, onStart }: { mistakes: MistakeItem[]; achievement?: Achievement; pendingTask?: DailyTask; mistakesDueNow: number; onStart: (task: DailyTask) => void }) {
  return (
    <section className={styles.lowerGrid}>
      <article className={styles.surface}><CompactHeader title="دفتر الأخطاء" icon={NotebookPen} href="/mistakes" />{mistakes.length === 0 ? <p className={styles.emptyMessage}>لا توجد فرص تحسن مسجلة حتى الآن.</p> : <div className={styles.panelList}>{mistakes.slice(0, 3).map((mistake) => <div key={mistake.id} className={styles.panelRow}><div style={{ minWidth: 0 }}><p className={styles.panelRowTitle}>{mistake.skillName}</p><p className={styles.panelRowMeta}>{mistake.questionBody}</p></div><span className={`${styles.chip} ${styles.coral}`}>{mistake.mistakeCount} مرات</span></div>)}</div>}</article>
      <article className={styles.surface}><CompactHeader title="أحدث إنجاز" icon={Award} href="/achievements" /><div className={styles.achievement}>{achievement ? <><span className={`${styles.panelIcon} ${styles.amber}`}><Award size={30} aria-hidden="true" /></span><h3>{achievement.title}</h3><p>{achievement.description}</p></> : <><Award size={29} color="var(--muted)" aria-hidden="true" /><p>أكمل أول مهمة لبدء سجل الإنجازات.</p></>}</div></article>
      <article className={styles.surface}><CompactHeader title="الخطوة التالية" icon={Target} href="/today" /><div className={styles.nextAction}><h3>{pendingTask ? TASK_META[pendingTask.type]?.title || "أكمل مهمة اليوم" : mistakesDueNow > 0 ? "راجع الأخطاء المستحقة" : "استكشف خريطة المواد"}</h3><p>{pendingTask ? "مهمتك محفوظة ويمكنك المتابعة من حيث توقفت." : "لا توجد مهمة معلقة الآن. اختر الخطوة المناسبة من مسارك."}</p>{pendingTask ? <button type="button" className={styles.wideButton} onClick={() => onStart(pendingTask)}>متابعة الآن<ArrowLeft size={14} aria-hidden="true" /></button> : <Link href={mistakesDueNow > 0 ? "/review" : "/subjects"} className={styles.wideButton}>{mistakesDueNow > 0 ? "بدء المراجعة" : "فتح المواد"}<ArrowLeft size={14} aria-hidden="true" /></Link>}</div></article>
    </section>
  );
}

function CompactHeader({ title, icon: Icon, href }: { title: string; icon: LucideIcon; href: string }) {
  return <div className={styles.compactHeader}><h2 className={styles.compactTitle}><Icon size={16} aria-hidden="true" />{title}</h2><Link href={href} className={styles.panelLink}>عرض الكل<ArrowLeft size={12} aria-hidden="true" /></Link></div>;
}

