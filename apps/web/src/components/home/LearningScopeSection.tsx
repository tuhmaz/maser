import Link from "next/link";
import { Beaker, BookOpen, Calculator, FlaskConical, GraduationCap, Languages, School } from "lucide-react";
import styles from "./Home.module.css";

const SUBJECTS = [
  { title: "الرياضيات", body: "فهم المفاهيم وتدريب متدرج", icon: Calculator, color: "#3478e5", soft: "#eaf2ff" },
  { title: "العلوم", body: "مهارات وأسئلة مرتبطة بالمنهج", icon: FlaskConical, color: "#11a270", soft: "#e7f8f0" },
  { title: "اللغة العربية", body: "قواعد وقراءة وفهم", icon: Languages, color: "#e98731", soft: "#fff1e5" },
] as const;

const GRADES = [
  { title: "الصف الخامس", icon: BookOpen },
  { title: "الصف السادس", icon: School },
  { title: "الصف السابع", icon: Calculator },
  { title: "الصف الثامن", icon: Beaker },
  { title: "الصف التاسع", icon: FlaskConical },
  { title: "الصف العاشر", icon: BookOpen },
  { title: "التوجيهي", icon: GraduationCap },
] as const;

export function LearningScopeSection() {
  return (
    <section id="subjects" className={`${styles.section} ${styles.sectionAlt}`}>
      <div className={styles.sectionInner}>
        <div className={styles.scopeGrid}>
          <div>
            <div className={styles.sectionHeading}><div><h2 className={styles.sectionTitle}>المواد الأساسية</h2><p className={styles.sectionCopy}>مسارات تعلم منظمة تقود إلى المهارة التالية بوضوح.</p></div></div>
            <div className={styles.cardGrid}>
              {SUBJECTS.map((subject) => {
                const Icon = subject.icon;
                return (
                  <Link key={subject.title} href="/grades" className={styles.subjectCard}>
                    <span className={styles.iconBox} style={{ color: subject.color, backgroundColor: subject.soft }}><Icon size={23} aria-hidden="true" /></span>
                    <h3>{subject.title}</h3><p>{subject.body}</p>
                  </Link>
                );
              })}
            </div>
          </div>
          <div>
            <div className={styles.sectionHeading}><div><h2 className={styles.sectionTitle}>اختر صفك</h2><p className={styles.sectionCopy}>المحتوى المنشور يظهر من بيانات المنصة الفعلية.</p></div><Link href="/grades" className={styles.ghostAction}>كل الصفوف</Link></div>
            <div className={styles.gradeGrid}>
              {GRADES.map((grade) => { const Icon = grade.icon; return <Link key={grade.title} href="/grades" className={styles.gradeCard}><Icon size={24} aria-hidden="true" /><h3>{grade.title}</h3></Link>; })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

