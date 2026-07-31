"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@alemedu/api-client";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookCopy,
  BookOpen,
  Boxes,
  ChevronDown,
  ClipboardCheck,
  Database,
  FileQuestion,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { api, bootstrapSession, clearSession, getAccessToken } from "@/lib/api";
import { ROLE_LABELS, canAccessSection } from "@/lib/roles";
import { useSiteSettings } from "@/lib/site-settings";

type NavItem = { href: string; label: string; icon: LucideIcon; group: "main" | "content" | "operations" };

const SECTIONS: NavItem[] = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard, group: "main" },
  { href: "/curriculum", label: "هيكل المنهاج", icon: BookCopy, group: "content" },
  { href: "/grades", label: "الصفوف", icon: GraduationCap, group: "content" },
  { href: "/subjects", label: "المواد", icon: LibraryBig, group: "content" },
  { href: "/units", label: "الوحدات", icon: Boxes, group: "content" },
  { href: "/lessons", label: "الدروس", icon: BookOpen, group: "content" },
  { href: "/skills", label: "المهارات", icon: Sparkles, group: "content" },
  { href: "/questions", label: "بنك الأسئلة", icon: Database, group: "content" },
  { href: "/quizzes", label: "الاختبارات", icon: FileQuestion, group: "content" },
  { href: "/reviews", label: "المراجعات", icon: ClipboardCheck, group: "operations" },
  { href: "/students", label: "المستخدمون", icon: Users, group: "operations" },
  { href: "/reports", label: "التقارير", icon: BarChart3, group: "operations" },
  { href: "/content-issues", label: "بلاغات المحتوى", icon: AlertTriangle, group: "operations" },
  { href: "/audit-logs", label: "سجل التدقيق", icon: Activity, group: "operations" },
  { href: "/settings", label: "الإعدادات", icon: Settings, group: "operations" },
];

const GROUP_LABELS = {
  main: "",
  content: "إدارة المحتوى",
  operations: "التشغيل والرقابة",
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [checked, setChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (isLoginPage) {
      setChecked(true);
      return;
    }
    if (getAccessToken()) {
      setChecked(true);
      api.me().then(setUser).catch(() => {});
      return;
    }
    // لا رمز في الذاكرة (أول تحميل أو بعد تحديث الصفحة) — حاول استعادة الجلسة
    // من كوكي رمز التحديث قبل التوجيه لصفحة الدخول.
    bootstrapSession().then((restoredUser) => {
      if (!restoredUser) {
        router.replace("/login");
        return;
      }
      setChecked(true);
      setUser(restoredUser);
    });
  }, [isLoginPage, router]);

  useEffect(() => {
    setMobileOpen(false);
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
        setMobileOpen(false);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const visibleSections = useMemo(
    () => SECTIONS.filter((section) => canAccessSection(user?.role, section.href)),
    [user?.role],
  );

  const results = useMemo(
    () => visibleSections.filter((section) => section.label.includes(query.trim())),
    [visibleSections, query],
  );

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    const destination = results[0];
    if (destination) router.push(destination.href);
  }

  async function handleLogout() {
    try {
      await api.logout(); // يمحو الخادم كوكي رمز التحديث
    } catch {
      // Local cleanup still prevents the browser from reusing a stale session.
    }
    clearSession();
    router.replace("/login");
  }

  if (isLoginPage) return <>{children}</>;
  if (!checked) return null;

  return (
    <div dir="rtl" className="min-h-screen bg-[#f4f7fb] lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
      <aside className="hidden min-h-screen bg-[#062b66] text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <SidebarContent pathname={pathname} user={user} onLogout={handleLogout} />
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 h-16 border-b border-white/10 bg-[#062b66] text-white">
          <div className="flex h-full items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 lg:hidden"
              aria-label="فتح قائمة الإدارة"
            >
              <Menu size={21} aria-hidden="true" />
            </button>

            <form onSubmit={handleSearchSubmit} className="relative mx-auto w-full max-w-2xl">
              <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/60" size={18} aria-hidden="true" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                className="h-10 w-full border-white/10 bg-white/10 pr-10 pl-14 text-white placeholder:text-white/55 focus:border-white/25 focus:ring-0"
                placeholder="ابحث في أقسام الإدارة..."
                aria-label="البحث في أقسام الإدارة"
              />
              <span className="pointer-events-none absolute left-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-white/15 px-2 py-1 text-[10px] text-white/55 sm:block">
                Ctrl K
              </span>

              {searchOpen && query.trim() && (
                <div className="absolute inset-x-0 top-12 overflow-hidden rounded-lg border border-[#dfe6f1] bg-white py-1 text-[#12213f] shadow-xl">
                  {results.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-[#64718a]">لا يوجد قسم مطابق.</p>
                  ) : (
                    results.slice(0, 6).map((result) => {
                      const Icon = result.icon;
                      return (
                        <Link key={result.href} href={result.href} className="flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-[#f3f7fd]">
                          <Icon size={18} className="text-[#1565d8]" aria-hidden="true" />
                          {result.label}
                        </Link>
                      );
                    })
                  )}
                </div>
              )}
            </form>

            <Link
              href="/audit-logs"
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/80 hover:bg-white/10 sm:flex"
              aria-label="سجل النشاط"
            >
              <Activity size={19} aria-hidden="true" />
            </Link>
            <Link
              href="/settings"
              className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-white/15 px-2.5 text-sm font-bold hover:bg-white/10"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0bb7c4] text-[10px] font-black">
                {initials(user?.displayName || user?.email || "A")}
              </span>
              <span className="hidden max-w-24 truncate xl:block">{user?.displayName || "المدير"}</span>
              <ChevronDown className="hidden text-white/50 xl:block" size={14} aria-hidden="true" />
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/55"
            onClick={() => setMobileOpen(false)}
            aria-label="إغلاق قائمة الإدارة"
          />
          <aside className="absolute inset-y-0 right-0 flex w-[min(290px,88vw)] flex-col bg-[#062b66] text-white shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg border border-white/15"
              aria-label="إغلاق القائمة"
            >
              <X size={19} aria-hidden="true" />
            </button>
            <SidebarContent pathname={pathname} user={user} onLogout={handleLogout} />
          </aside>
        </div>
      )}
    </div>
  );
}

function SidebarContent({
  pathname,
  user,
  onLogout,
}: {
  pathname: string;
  user: User | null;
  onLogout: () => void;
}) {
  const settings = useSiteSettings();
  return (
    <>
      <div className="flex h-16 items-center border-b border-white/10 px-5">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0bb7c4] text-white">
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt={settings.siteName} className="h-full w-full object-cover" />
            ) : (
              <ShieldCheck size={20} aria-hidden="true" />
            )}
          </span>
          <span>
            <span className="block text-lg font-black leading-none">{settings.siteName}</span>
            <span className="mt-1 block text-[10px] font-bold text-white/55">لوحة الإدارة</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="أقسام لوحة الإدارة">
        {(["main", "content", "operations"] as const).map((group) => (
          <div key={group} className={group === "main" ? "" : "mt-5"}>
            {GROUP_LABELS[group] && <p className="mb-2 px-3 text-[10px] font-black text-white/40">{GROUP_LABELS[group]}</p>}
            <div className="space-y-1">
              {SECTIONS.filter((item) => item.group === group && canAccessSection(user?.role, item.href)).map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-bold transition ${
                      active ? "bg-[#0b62bd] text-white shadow-sm" : "text-white/75 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon size={18} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-lg bg-white/5 p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-xs font-black">
            {initials(user?.displayName || user?.email || "A")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black">{user?.displayName || "مستخدم الإدارة"}</p>
            <p className="mt-1 truncate text-[10px] text-white/45">{ROLE_LABELS[user?.role || ""] || user?.email || "جاري التحميل"}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-bold text-white/65 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut size={18} aria-hidden="true" />
          تسجيل الخروج
        </button>
      </div>
    </>
  );
}

function initials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
