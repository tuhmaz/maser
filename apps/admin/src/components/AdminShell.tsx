"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/api";

// الأقسام حسب docs/user-journeys.md (قسم "لوحة الإدارة")
const SECTIONS = [
  { href: "/", label: "Dashboard" },
  { href: "/curriculum", label: "Curriculum" },
  { href: "/grades", label: "Grades" },
  { href: "/subjects", label: "Subjects" },
  { href: "/units", label: "Units" },
  { href: "/lessons", label: "Lessons" },
  { href: "/skills", label: "Skills" },
  { href: "/questions", label: "Questions" },
  { href: "/quizzes", label: "Quizzes" },
  { href: "/reviews", label: "Reviews" },
  { href: "/students", label: "Students" },
  { href: "/reports", label: "Reports" },
  { href: "/content-issues", label: "Content Issues" },
  { href: "/audit-logs", label: "Audit Logs" },
  { href: "/settings", label: "Settings" },
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
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-l bg-white p-4">
        <div className="mb-6 text-lg font-bold">Alemedu Admin</div>
        <nav className="flex flex-col gap-1 text-sm">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={`rounded-md px-3 py-2 hover:bg-gray-100 ${pathname === s.href ? "bg-gray-100 font-medium" : ""}`}
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
