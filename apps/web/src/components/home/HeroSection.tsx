import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BarChart3, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import styles from "./Home.module.css";

export function HeroSection() {
  return (
    <section id="top" className={styles.hero}>
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><Sparkles size={15} aria-hidden="true" />تعلم يومي مبني على مستواك</span>
          <h1 className={styles.heroTitle}>تعلم مخصص لطلاب الأردن<br /><span>من الأساس حتى التوجيهي</span></h1>
          <p className={styles.heroCopyText}>اختبار يحدد نقطة البداية، وخطة يومية واضحة، ومراجعة ذكية للأخطاء حتى تتحول كل جلسة قصيرة إلى إتقان حقيقي.</p>
          <div className={styles.heroActions}>
            <Link href="/free-test" className={styles.primaryAction}><BarChart3 size={18} aria-hidden="true" />ابدأ اختبار المستوى</Link>
            <Link href="/grades" className={styles.ghostAction}>استكشف الصفوف<ArrowLeft size={17} aria-hidden="true" /></Link>
          </div>
          <div className={styles.trustRow}>
            <span className={styles.trustItem}><CheckCircle2 size={16} aria-hidden="true" />خطة واضحة بلا تشتيت</span>
            <span className={styles.trustItem}><ShieldCheck size={16} aria-hidden="true" />تقدم شخصي بلا مقارنة</span>
          </div>
        </div>
        <div className={styles.preview}>
          <Image src="/images/student-dashboard-preview.png" alt="معاينة حقيقية للوحة الطالب في منصة Alemedu" fill priority sizes="(max-width: 820px) 100vw, 52vw" />
          <span className={styles.previewBadge}><CheckCircle2 size={14} aria-hidden="true" />واجهة الطالب الفعلية</span>
        </div>
      </div>
    </section>
  );
}

