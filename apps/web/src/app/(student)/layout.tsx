"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Award,
  BookOpen,
  ChartNoAxesColumnIncreasing,
  CircleUserRound,
  Flame,
  Home,
  NotebookPen,
  RefreshCcw,
  Settings,
  Sparkles,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { getAccessToken } from "@/lib/api";
import { BrandMark } from "@/components/BrandMark";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV_LINKS: NavItem[] = [
  { href: "/dashboard", label: "الرئيسية", icon: Home },
  { href: "/today", label: "مهمتي اليوم", icon: Target },
  { href: "/subjects", label: "المواد", icon: BookOpen },
  { href: "/review", label: "المراجعة", icon: RefreshCcw },
  { href: "/progress", label: "تقدمي", icon: ChartNoAxesColumnIncreasing },
  { href: "/mistakes", label: "فرص التحسن", icon: NotebookPen },
  { href: "/achievements", label: "إنجازاتي", icon: Award },
  { href: "/family", label: "العائلة", icon: Users },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

const MOBILE_LINKS = NAV_LINKS.slice(0, 5);

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
    <div dir="rtl" className="min-h-screen bg-[#f5f7fb] lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden min-h-screen border-l border-[#e3e8f2] bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="px-6 py-6">
          <BrandMark />
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label="التنقل الرئيسي">
          {NAV_LINKS.map((link) => (
            <StudentNavLink key={link.href} item={link} active={isActive(pathname, link.href)} />
          ))}
        </nav>
        <div className="m-4 rounded-lg bg-[#edf3ff] p-4">
          <div className="flex items-center gap-2 text-[#244fc2]">
            <Sparkles size={18} aria-hidden="true" />
            <p className="text-sm font-black">خطوة صغيرة كل يوم</p>
          </div>
          <p className="mt-2 text-xs leading-6 text-slate-600">
            الاستمرار أهم من الجلسة الطويلة. مهمتك اليومية تكفي.
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-[#e3e8f2] bg-white/95 backdrop-blur lg:static">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8">
            <div className="lg:hidden">
              <BrandMark compact />
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-bold text-slate-950">مرحباً بك</p>
              <p className="mt-1 text-xs text-slate-500">جاهز لخطوة اليوم؟</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="status-chip bg-[#fff6df] text-[#9a6500]">
                <Flame size={15} aria-hidden="true" />
                0 أيام
              </span>
              <Link
                href="/settings"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e3e8f2] bg-white text-slate-600 transition hover:border-[#b8c8ef] hover:text-[#3568e8]"
                aria-label="الحساب والإعدادات"
              >
                <CircleUserRound size={21} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[#e3e8f2] bg-white px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-10px_30px_rgba(31,48,83,0.08)] lg:hidden"
        aria-label="التنقل الرئيسي"
      >
        {MOBILE_LINKS.map((link) => {
          const Icon = link.icon;
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] font-bold transition ${
                active ? "bg-[#edf3ff] text-[#244fc2]" : "text-slate-500"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
              <span className="max-w-full truncate">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function StudentNavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold transition ${
        active ? "bg-[#edf3ff] text-[#244fc2]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      <Icon size={20} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
      {item.label}
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}
