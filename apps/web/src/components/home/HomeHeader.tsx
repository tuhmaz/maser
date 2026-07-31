"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, LogIn, Menu, X } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import styles from "./Home.module.css";

const LINKS = [
  ["الرئيسية", "#top"],
  ["المواد", "#subjects"],
  ["كيف تعمل؟", "#how"],
  ["الاختبار المجاني", "/free-test"],
] as const;

export function HomeHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <BrandMark light href="/" />
        <nav className={styles.nav} aria-label="التنقل الرئيسي">
          {LINKS.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
        <div className={styles.headerActions}>
          <ThemeToggle />
          <Link href="/register" className={`${styles.primaryAction} ${styles.desktopAction}`}>
            ابدأ مجاناً
            <ArrowLeft size={16} aria-hidden="true" />
          </Link>
          <Link href="/login" className={`${styles.secondaryAction} ${styles.desktopAction}`}>
            <LogIn size={16} aria-hidden="true" />
            تسجيل الدخول
          </Link>
          <button type="button" className={styles.menuButton} onClick={() => setOpen((value) => !value)} aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}>
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className={styles.mobileMenu} aria-label="التنقل على الهاتف">
          {LINKS.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
          <Link href="/register" onClick={() => setOpen(false)}>إنشاء حساب مجاني</Link>
          <Link href="/login" onClick={() => setOpen(false)}>تسجيل الدخول</Link>
        </nav>
      )}
    </header>
  );
}

