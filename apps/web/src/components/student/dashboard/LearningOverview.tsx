import Link from "next/link";
import { ArrowLeft, BarChart3, BookOpen, Calculator, FlaskConical, Languages, type LucideIcon } from "lucide-react";
import { SUBJECT_TONES } from "./constants";
import type { SubjectRow } from "./types";
import styles from "./Dashboard.module.css";

const SUBJECT_ICONS: LucideIcon[] = [Calculator, FlaskConical, Languages, BookOpen];
const TONE_COLORS: Record<string, string> = { blue: "#3976e8", green: "#16a36f", orange: "#ef8b38", violet: "#8b5bd7" };

export default function LearningOverview({ subjects, loading, skillCompletion, questionsAnswered, mastered, needsReview, lastQuizScore }: { subjects: SubjectRow[]; loading: boolean; skillCompletion: number; questionsAnswered: number; mastered: number; needsReview: number; lastQuizScore: number | null }) {
  return (
    <section className={styles.learningGrid}>
      <article className={styles.surface}><div className={styles.sectionBody}><div className={styles.sectionTop}><div><h2 className={styles.sectionTitle}>المواد الدراسية</h2><p className={styles.panelCopy}>النسب محسوبة من المهارات المتقنة في كل مادة.</p></div><Link href="/subjects" className={styles.sectionLink}>عرض الكل<ArrowLeft size={13} aria-hidden="true" /></Link></div>{loading && subjects.length === 0 ? <div className={styles.skeleton} style={{ marginTop: 18 }} /> : subjects.length === 0 ? <p className={styles.emptyMessage}>لم تُنشر مواد مرتبطة بصفك بعد.</p> : <div className={styles.subjectGrid}>{subjects.slice(0, 4).map((row, index) => <SubjectCard key={row.subject.id} row={row} index={index} />)}</div>}</div></article>
      <article className={styles.surface}><div className={styles.panelHeader}><div><h2 className={styles.panelTitle}><BarChart3 size={17} aria-hidden="true" />تقدمك الحالي</h2><p className={styles.panelCopy}>ملخص مباشر من إجاباتك المسجلة.</p></div><Link href="/progress" className={styles.panelLink}>التفاصيل</Link></div><div className={styles.summaryBody}><div className={styles.summaryRing} style={{ background: `conic-gradient(var(--teal) ${skillCompletion * 3.6}deg, var(--border) 0deg)` }}><div className={styles.summaryRingInner}><strong>{skillCompletion}%</strong><small>إتقان</small></div></div><dl className={styles.progressList}><ProgressRow label="أسئلة محلولة" value={questionsAnswered} /><ProgressRow label="مهارات متقنة" value={mastered} /><ProgressRow label="تحتاج مراجعة" value={needsReview} /><ProgressRow label="آخر نتيجة" value={lastQuizScore == null ? "غير متاحة" : `${Math.round(lastQuizScore)}%`} /></dl></div></article>
    </section>
  );
}

function SubjectCard({ row, index }: { row: SubjectRow; index: number }) {
  const Icon = SUBJECT_ICONS[index % SUBJECT_ICONS.length];
  const tone = SUBJECT_TONES[index % SUBJECT_TONES.length];
  const color = TONE_COLORS[tone];
  const completion = row.progress?.completionPercent ?? 0;
  return <Link href={`/subjects/${row.subject.id}`} className={styles.subjectCard}><div className={styles.subjectTop}><span className={`${styles.subjectIcon} ${styles[tone]}`}><Icon size={18} aria-hidden="true" /></span><ArrowLeft size={14} color="var(--muted)" aria-hidden="true" /></div><h3 className={styles.subjectTitle}>{row.subject.name}</h3><div className={styles.subjectBottom}><div><p className={styles.subjectValue} style={{ color }}>{completion}%</p><p className={styles.subjectLabel}>نسبة الإتقان</p></div><div className={styles.miniRing} style={{ background: `conic-gradient(${color} ${completion * 3.6}deg, var(--border) 0deg)` }}><span /></div></div></Link>;
}

function ProgressRow({ label, value }: { label: string; value: string | number }) {
  return <div className={styles.progressRow}><dt>{label}</dt><dd>{typeof value === "number" ? value.toLocaleString("ar") : value}</dd></div>;
}

