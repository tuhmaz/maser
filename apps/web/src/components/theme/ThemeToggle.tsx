"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import styles from "./ThemeToggle.module.css";

type Theme = "light" | "dark";

export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    setTheme(current);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    window.localStorage.setItem("alemedu-theme", next);
    setTheme(next);
  }

  const dark = theme === "dark";
  const label = dark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`${styles.toggle} ${showLabel ? "" : styles.iconOnly}`}
      aria-label={label}
      title={label}
    >
      {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
      {showLabel && <span className={styles.label}>{dark ? "الوضع الفاتح" : "الوضع الداكن"}</span>}
    </button>
  );
}

