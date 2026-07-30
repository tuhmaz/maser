"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/api";

const NAV_LINKS = [
  { href: "/today", label: "مهمتي اليوم" },
  { href: "/subjects", label: "موادي" },
  { href: "/mistakes", label: "دفتر الأخطاء" },
  { href: "/review", label: "المراجعة" },
  { href: "/progress", label: "التقدم" },
  { href: "/achievements", label: "الإنجازات" },
  { href: "/settings", label: "الإعدادات" },
];

// حراسة بسيطة على مستوى الواجهة فقط لتحسين تجربة المستخدم.
// القاعدة الذهبية (docs/security-requirements.md): هذا لا يغني إطلاقًا عن
// التحقق الفعلي من الصلاحية داخل services/api لكل طلب.
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) return null;

  return (
    <div dir="rtl" className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(15,118,110,0.10),transparent_28rem),var(--background)]">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-700 text-sm font-black text-white">
              A
            </span>
            <span>
              <span className="block text-base font-black text-slate-950">Alemedu</span>
              <span className="block text-xs text-slate-500">مهمة قصيرة. تقدم واضح.</span>
            </span>
          </Link>
        <nav className="flex gap-2 overflow-x-auto pb-1 text-sm lg:pb-0">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-md px-3 py-2 font-semibold transition ${pathname === link.href ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-teal-50 hover:text-teal-800"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        </div>
      </header>
      <main className="page-shell">{children}</main>
    </div>
  );
}
