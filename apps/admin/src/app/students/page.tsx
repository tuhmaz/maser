"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, ShieldCheck, Users } from "lucide-react";
import type { AdminUser, Role } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "@/components/AdminPageHeader";

const ROLE_LABELS: Record<Role, string> = {
  student: "طالب",
  parent: "ولي أمر",
  content_editor: "محرر محتوى",
  content_reviewer: "مراجع تعليمي",
  support: "دعم",
  admin: "مدير",
  super_admin: "مدير أعلى",
};

const ASSIGNABLE_ROLES: Role[] = ["student", "parent", "content_editor", "content_reviewer", "support", "admin"];

export default function StudentsPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tab, setTab] = useState<"students" | "team">("students");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api.adminListUsers()
      .then(setUsers)
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب المستخدمين"))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const visibleUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((user) => {
      const belongsToTab = tab === "students" ? user.role === "student" : user.role !== "student";
      const matches = !normalized || [user.displayName, user.email, user.gradeName, ROLE_LABELS[user.role]]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
      return belongsToTab && matches;
    });
  }, [query, tab, users]);

  async function changeRole(user: AdminUser, role: Role) {
    if (role === user.role) return;
    const confirmed = window.confirm(`تغيير دور ${user.displayName || user.email} إلى "${ROLE_LABELS[role]}"؟ سيتم إلغاء جلساته الحالية.`);
    if (!confirmed) return;
    setBusyId(user.id);
    setError(null);
    try {
      await api.adminChangeUserRole(user.id, role);
      load();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر تغيير الصلاحية");
    } finally {
      setBusyId(null);
    }
  }

  const studentsCount = users.filter((user) => user.role === "student").length;
  const teamCount = users.length - studentsCount;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="المستخدمون والصلاحيات"
        title="الطلاب والفريق"
        description="بيانات محدودة لأغراض الدعم، وتغيير الأدوار مرتبط بخادم الصلاحيات ويلغي الجلسات القديمة."
        actions={<Button variant="secondary" onClick={load} disabled={loading}><RefreshCw size={17} className={loading ? "animate-spin" : ""} /> تحديث</Button>}
      />

      {error && <p role="alert" className="admin-error">{error}</p>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <button type="button" onClick={() => setTab("students")} className={`min-h-10 rounded-lg border px-4 text-sm font-black ${tab === "students" ? "border-[#1565d8] bg-[#eaf2ff] text-[#1565d8]" : "border-[#dfe6f1] bg-white text-[#64718a]"}`}>
            الطلاب ({studentsCount})
          </button>
          <button type="button" onClick={() => setTab("team")} className={`min-h-10 rounded-lg border px-4 text-sm font-black ${tab === "team" ? "border-[#1565d8] bg-[#eaf2ff] text-[#1565d8]" : "border-[#dfe6f1] bg-white text-[#64718a]"}`}>
            الفريق ({teamCount})
          </button>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8d99ad]" size={17} />
          <input className="w-full pr-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث بالاسم أو البريد..." />
        </div>
      </div>

      <section className="admin-surface overflow-hidden">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>الحالة</th>
                {tab === "students" ? <><th>الصف</th><th>سلسلة الأيام</th><th>تاريخ التسجيل</th></> : <><th>الدور</th><th>تاريخ الإضافة</th></>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f6]">
              {visibleUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eaf2ff] text-xs font-black text-[#1565d8]">{initials(user.displayName || user.email)}</span>
                      <div>
                        <p className="font-black text-[#12213f]">{user.displayName || "بلا اسم"}</p>
                        <p dir="ltr" className="mt-1 text-left text-xs text-[#64718a]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td><AdminStatusBadge label={user.isActive ? "نشط" : "معطل"} tone={user.isActive ? "success" : "neutral"} /></td>
                  {tab === "students" ? (
                    <>
                      <td className="text-[#526078]">{user.gradeName || "غير محدد"}</td>
                      <td className="font-black text-[#12213f]">{user.currentStreak ?? 0}</td>
                      <td className="whitespace-nowrap text-xs text-[#64718a]">{formatDate(user.createdAt)}</td>
                    </>
                  ) : (
                    <>
                      <td>
                        {user.role === "super_admin" ? (
                          <AdminStatusBadge label="مدير أعلى (ثابت)" tone="info" />
                        ) : (
                          <select value={user.role} disabled={busyId === user.id} onChange={(event) => void changeRole(user, event.target.value as Role)}>
                            {ASSIGNABLE_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-xs text-[#64718a]">{formatDate(user.createdAt)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && visibleUsers.length === 0 && <div className="p-5"><AdminEmptyState title="لا يوجد مستخدمون مطابقون" icon={tab === "students" ? <Users size={30} /> : <ShieldCheck size={30} />} /></div>}
      </section>
    </div>
  );
}

function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("ar-JO");
}
