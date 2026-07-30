"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/api";

// الأقسام حسب docs/user-journeys.md (قسم "لوحة الإدارة")
const SECTIONS = [
  { href: "/", label: "لوحة التشغيل" },
  { href: "/curriculum", label: "المنهاج" },
  { href: "/grades", label: "الصفوف" },
  { href: "/subjects", label: "المواد" },
  { href: "/units", label: "الوحدات" },
  { href: "/lessons", label: "الدروس" },
  { href: "/skills", label: "المهارات" },
  { href: "/questions", label: "الأسئلة" },
  { href: "/quizzes", label: "الاختبارات" },
  { href: "/reviews", label: "المراجعات" },
  { href: "/students", label: "الطلاب" },
  { href: "/reports", label: "التقارير" },
  { href: "/content-issues", label: "مشاكل المحتوى" },
  { href: "/audit-logs", label: "سجل التدقيق" },
  { href: "/settings", label: "الإعدادات" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (isLoginPage) {
      setChecked(true);
      return;
    }
    if (!getAccessToken()) {
      router.replace("/login");
    } else {
      setChecked(true);
    }
  }, [isLoginPage, router]);

  if (isLoginPage) return <>{children}</>;
  if (!checked) return null;

  return (
    <div dir="rtl" className="flex min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(15,118,110,0.08),transparent_24rem),var(--background)]">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-l border-slate-200 bg-white/95 p-4 backdrop-blur lg:block">
        <div className="mb-6 rounded-md bg-slate-950 p-4 text-white">
          <div className="text-lg font-black">Alemedu</div>
          <div className="mt-1 text-xs text-white/60">لوحة إدارة المحتوى والتشغيل</div>
        </div>
        <nav className="flex flex-col gap-1 text-sm">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={`rounded-md px-3 py-2 font-semibold transition ${pathname === s.href ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-teal-50 hover:text-teal-800"}`}
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="border-b border-slate-200 bg-white/85 px-5 py-4 backdrop-blur lg:hidden">
          <div className="font-black text-slate-950">Alemedu Admin</div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 text-sm">
            {SECTIONS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className={`shrink-0 rounded-md px-3 py-2 font-semibold ${pathname === s.href ? "bg-teal-700 text-white" : "bg-white text-slate-600"}`}
              >
                {s.label}
              </Link>
            ))}
          </nav>
        </header>
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
