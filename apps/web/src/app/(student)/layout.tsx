"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-6 py-3">
        <nav className="mx-auto flex max-w-4xl flex-wrap gap-4 text-sm">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-blue-600">
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
