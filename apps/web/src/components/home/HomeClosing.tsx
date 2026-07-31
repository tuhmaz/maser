import Link from "next/link";
import { ArrowLeft, BrainCircuit } from "lucide-react";
import styles from "./Home.module.css";

export function HomeClosing() {
  return (
    <>
      <section className={styles.ctaSection}>
        <div className={styles.cta}>
          <div className={styles.ctaCopy}><h2>ابدأ رحلة تعلم أوضح من اليوم</h2><p>ابدأ باختبار قصير، ثم انتقل إلى خطة مبنية على مستواك ونتائجك الحقيقية.</p><Link href="/register" className={styles.primaryAction} style={{ marginTop: 20 }}>إنشاء حساب مجاني<ArrowLeft size={17} aria-hidden="true" /></Link></div>
          <div className={styles.ctaVisual}><BrainCircuit size={138} strokeWidth={1.15} aria-hidden="true" /></div>
        </div>
      </section>
      <footer className={styles.footer}><div className={styles.footerInner}><span>Alemedu © 2026</span><div className={styles.footerLinks}><Link href="/grades">الصفوف</Link><Link href="/free-test">الاختبار المجاني</Link><Link href="/login">تسجيل الدخول</Link></div><span>تعلم ذكي، تقدم بثقة</span></div></footer>
    </>
  );
}

