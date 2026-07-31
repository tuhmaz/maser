"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@alemedu/api-client";
import {
  Award,
  BookOpen,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  Home,
  LogOut,
  Menu,
  NotebookPen,
  RefreshCcw,
  Search,
  Settings,
  Sparkles,
  Target,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { api, bootstrapSession, clearSession, getAccessToken } from "@/lib/api";

type NavItem = {
  href: string;
  label: string;
  helper: string;
  icon: LucideIcon;
};

const NAV_LINKS: NavItem[] = [
  { href: "/dashboard", label: "الرئيسية", helper: "ملخص يومك", icon: Home },
  { href: "/today", label: "مهمتي اليوم", helper: "خطتك اليومية", icon: Target },
  { href: "/subjects", label: "المواد", helper: "خريطة المنهج", icon: BookOpen },
  { href: "/review", label: "المراجعة", helper: "تثبيت التعلم", icon: RefreshCcw },
  { href: "/mistakes", label: "دفتر الأخطاء", helper: "فرص التحسن", icon: NotebookPen },
  { href: "/progress", label: "التقدم", helper: "المهارات والنتائج", icon: ChartNoAxesColumnIncreasing },
  { href: "/achievements", label: "الإنجازات", helper: "محطات رحلتك", icon: Award },
  { href: "/family", label: "العائلة", helper: "مشاركة التقدم", icon: Users },
  { href: "/settings", label: "الإعدادات", helper: "الحساب والتفضيلات", icon: Settings },
];

const MOBILE_LINKS = NAV_LINKS.filter((item) =>
  ["/dashboard", "/today", "/subjects", "/mistakes", "/progress"].includes(item.href),
);

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [checked, setChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (getAccessToken()) {
      setChecked(true);
      api.me().then(setUser).catch(() => {});
      return;
    }
    // لا رمز في الذاكرة (أول تحميل للصفحة أو بعد تحديثها) — حاول استعادة
    // الجلسة من كوكي رمز التحديث قبل التوجيه لصفحة الدخول.
    bootstrapSession().then((restoredUser) => {
      if (!restoredUser) {
        router.replace("/login");
        return;
      }
      setChecked(true);
      setUser(restoredUser);
    });
  }, [router]);

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
    setSearchOpen(false);
    setQuery("");
  }, [pathname]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setAccountOpen(false);
        setMobileOpen(false);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const results = useMemo(() => {
    const normalized = query.trim();
    if (!normalized) return NAV_LINKS;
    return NAV_LINKS.filter(
      (item) => item.label.includes(normalized) || item.helper.includes(normalized),
    );
  }, [query]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    if (results[0]) router.push(results[0].href);
  }

  async function logout() {
    try {
      await api.logout(); // يمحو الخادم كوكي رمز التحديث
    } catch {
      // يجب مسح الجلسة محليًا حتى لو تعذّر الوصول للخادم مؤقتًا
    }
    clearSession();
    router.replace("/login");
  }

  if (!checked) return null;

  const firstName = user?.displayName?.trim().split(/\s+/)[0] || "الطالب";
  const initial = firstName.charAt(0) || "ط";

  return (
    <div dir="rtl" className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <aside className="fixed inset-y-0 right-0 z-50 hidden w-[232px] border-l border-[var(--border)] bg-[var(--surface)] lg:flex lg:flex-col">
        <Sidebar pathname={pathname} firstName={firstName} onLogout={() => void logout()} />
      </aside>

      <div className="min-w-0 lg:mr-[232px]">
        <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
          <div className="flex h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] lg:hidden"
              aria-label="فتح قائمة التنقل"
            >
              <Menu size={21} aria-hidden="true" />
            </button>

            <div className="lg:hidden">
              <BrandMark compact href="/dashboard" />
            </div>

            <form onSubmit={submitSearch} className="relative mx-auto hidden w-full max-w-xl sm:block">
              <Search
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                size={18}
                aria-hidden="true"
              />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                className="h-11 min-h-0 rounded-lg border-[var(--border)] bg-[var(--surface-subtle)] py-2 pr-10 pl-16 text-xs text-[var(--foreground)]"
                placeholder="ابحث في صفحات التعلم..."
                aria-label="البحث في صفحات الطالب"
              />
              <kbd className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] font-bold text-[var(--muted)]">
                Ctrl K
              </kbd>
              {searchOpen && (
                <div className="absolute inset-x-0 top-[calc(100%+8px)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-2 shadow-[0_18px_45px_var(--shadow-color)]">
                  {results.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-[var(--muted)]">لا توجد صفحة مطابقة.</p>
                  ) : (
                    results.slice(0, 6).map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.href}
                          type="button"
                          onClick={() => router.push(item.href)}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-right hover:bg-[var(--surface-subtle)]"
                        >
                          <Icon size={17} className="text-[#2868dc]" aria-hidden="true" />
                          <span className="min-w-0">
                            <span className="block text-xs font-black text-[var(--foreground)]">{item.label}</span>
                            <span className="mt-0.5 block text-[10px] text-[var(--muted)]">{item.helper}</span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </form>

            <div className="mr-auto flex items-center gap-2">
              <ThemeToggle />
              <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-right hover:bg-[var(--surface-subtle)]"
                aria-expanded={accountOpen}
                aria-label="قائمة الحساب"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dff4f3] text-sm font-black text-[#087f83]">
                  {initial}
                </span>
                <span className="hidden sm:block">
                  <span className="block max-w-36 truncate text-xs font-black text-[var(--foreground)]">
                    {user?.displayName || "حساب الطالب"}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-[var(--muted)]">طالب</span>
                </span>
                <ChevronDown size={15} className="text-[var(--muted)]" aria-hidden="true" />
              </button>

              {accountOpen && (
                <div className="absolute left-0 top-[calc(100%+8px)] w-56 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-2 shadow-[0_18px_45px_var(--shadow-color)]">
                  <div className="border-b border-[var(--border)] px-3 py-2">
                    <p className="truncate text-xs font-black text-[var(--foreground)]">{user?.displayName || "حساب الطالب"}</p>
                    <p className="mt-1 truncate text-[10px] text-[var(--muted)]">{user?.email}</p>
                  </div>
                  <Link href="/settings" className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold hover:bg-[var(--surface-subtle)]">
                    <UserRound size={16} aria-hidden="true" />
                    إعدادات الحساب
                  </Link>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold text-[#c54553] hover:bg-[#fff1f2]"
                  >
                    <LogOut size={16} aria-hidden="true" />
                    تسجيل الخروج
                  </button>
                </div>
              )}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 pb-28 sm:px-6 lg:px-7 lg:py-7 lg:pb-8 xl:px-9">
          {children}
        </main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#061c49]/45"
            onClick={() => setMobileOpen(false)}
            aria-label="إغلاق قائمة التنقل"
          />
          <aside className="absolute inset-y-0 right-0 flex w-[min(310px,88vw)] flex-col bg-[var(--surface)] shadow-2xl">
            <div className="flex h-[72px] items-center justify-between border-b border-[var(--border)] px-5">
              <BrandMark href="/dashboard" />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-subtle)]"
                aria-label="إغلاق القائمة"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <Sidebar pathname={pathname} firstName={firstName} onLogout={() => void logout()} mobile />
          </aside>
        </div>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-[var(--border)] bg-[var(--surface)] px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-10px_30px_var(--shadow-color)] lg:hidden"
        aria-label="التنقل الرئيسي"
      >
        {MOBILE_LINKS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] font-bold ${
                active ? "bg-[#eaf2ff] text-[#1559c5]" : "text-[var(--muted)]"
              }`}
            >
              <Icon size={19} strokeWidth={active ? 2.6 : 2} aria-hidden="true" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function Sidebar({
  pathname,
  firstName,
  onLogout,
  mobile = false,
}: {
  pathname: string;
  firstName: string;
  onLogout: () => void;
  mobile?: boolean;
}) {
  return (
    <>
      {!mobile && (
        <div className="border-b border-[var(--border)] px-6 py-5">
          <BrandMark href="/dashboard" />
        </div>
      )}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="التنقل الرئيسي">
        <p className="px-3 pb-2 text-[10px] font-black text-[var(--muted)]">مساحة {firstName}</p>
        <div className="space-y-1">
          {NAV_LINKS.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold transition ${
                  active
                    ? "bg-[#07357b] text-white shadow-[0_8px_18px_rgba(7,53,123,0.18)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
                <span className="min-w-0 flex-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="p-4">
        <Link href="/progress" className="block rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
          <span className="flex items-center gap-2 text-xs font-black text-[var(--primary)]">
            <Sparkles size={17} className="text-[#0aa5a8]" aria-hidden="true" />
            خطوة صغيرة كل يوم
          </span>
          <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">راجع تقدمك واختر الخطوة التالية المناسبة لك.</p>
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="mt-2 flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-xs font-bold text-[#8c5060] hover:bg-[#fff1f2]"
        >
          <LogOut size={16} aria-hidden="true" />
          تسجيل الخروج
        </button>
      </div>
    </>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}
