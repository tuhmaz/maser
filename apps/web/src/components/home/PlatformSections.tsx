import { BarChart3, BookOpenCheck, CalendarCheck2, ClipboardCheck, NotebookPen, Target, TrendingUp } from "lucide-react";
import styles from "./Home.module.css";

const FEATURES = [
  { title: "اختبار تشخيصي", body: "يحدد المهارات التي تحتاج إلى بدء أو مراجعة.", icon: ClipboardCheck, color: "#3478e5", soft: "#eaf2ff" },
  { title: "خطة يومية", body: "مهام قصيرة مرتبة حسب الأولوية والاستمرارية.", icon: CalendarCheck2, color: "#0c9f9f", soft: "#e5f7f5" },
  { title: "دفتر للأخطاء", body: "يحفظ فرص التحسن ويعيدها في الوقت المناسب.", icon: NotebookPen, color: "#e16d5d", soft: "#fff0ed" },
  { title: "تقدم مفهوم", body: "يعرض إتقان المهارات من الإجابات المسجلة.", icon: TrendingUp, color: "#835fd1", soft: "#f1edff" },
] as const;

const STEPS = [
  { title: "اختبر نقطة البداية", body: "أسئلة قصيرة تكشف ما تعرفه وما يحتاج دعماً.", icon: ClipboardCheck },
  { title: "استلم خطتك", body: "مهمة يومية مبنية على نتائجك الحالية.", icon: Target },
  { title: "تعلم وتقدم", body: "أكمل التدريب وراقب إتقان المهارات بوضوح.", icon: BarChart3 },
] as const;

export function PlatformSections() {
  return (
    <>
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeading}><div><h2 className={styles.sectionTitle}>ميزات مصممة لنجاحك</h2><p className={styles.sectionCopy}>كل أداة تخدم قراراً تعليمياً واضحاً، لا مجرد رقم على الشاشة.</p></div></div>
          <div className={styles.featureGrid}>
            {FEATURES.map((feature) => { const Icon = feature.icon; return <article key={feature.title} className={styles.featureCard}><span className={styles.iconBox} style={{ color: feature.color, backgroundColor: feature.soft }}><Icon size={23} aria-hidden="true" /></span><div><h3>{feature.title}</h3><p>{feature.body}</p></div></article>; })}
          </div>
        </div>
      </section>
      <section id="how" className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeading}><div><h2 className={styles.sectionTitle}>كيف تعمل المنصة؟</h2><p className={styles.sectionCopy}>ثلاث خطوات تبقي التركيز على التعلم نفسه.</p></div></div>
          <div className={styles.stepsGrid}>
            {STEPS.map((step, index) => { const Icon = step.icon; return <article key={step.title} className={styles.stepCard}><span className={styles.stepNumber}>{index + 1}</span><span className={styles.iconBox} style={{ color: index === 1 ? "#0c9f9f" : "#3478e5", backgroundColor: index === 1 ? "#e5f7f5" : "#eaf2ff" }}><Icon size={29} aria-hidden="true" /></span><h3>{step.title}</h3><p>{step.body}</p></article>; })}
          </div>
        </div>
      </section>
    </>
  );
}

