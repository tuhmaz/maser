"use client";

import { useEffect, useState } from "react";
import type { AdminUser, Role } from "@alemedu/api-client";
import { api } from "@/lib/api";

const ROLE_LABELS: Record<Role, string> = {
  student: "طالب",
  parent: "ولي أمر",
  content_editor: "محرر محتوى",
  content_reviewer: "مراجع تعليمي",
  support: "دعم",
  admin: "مدير",
  super_admin: "مدير أعلى",
};

const STAFF_ROLES: Role[] = ["content_editor", "content_reviewer", "support", "admin"];

// بيانات محدودة للطلاب لأغراض الدعم فقط — مبدأ الخصوصية: عدم إظهار بيانات
// غير ضرورية (docs/security-requirements.md). قسم "الفريق" يدير الصلاحيات.
export default function StudentsPage() {
  const [students, setStudents] = useState<AdminUser[]>([]);
  const [staff, setStaff] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    api.adminListUsers("student").then(setStudents).catch(() => setStudents([]));
    api.adminListUsers().then((all) => setStaff(all.filter((u) => u.role !== "student"))).catch(() => setStaff([]));
  }
  useEffect(load, []);

  async function changeRole(userId: string, role: Role) {
    setBusyId(userId);
    setError(null);
    try {
      await api.adminChangeUserRole(userId, role);
      load();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر تغيير الصلاحية");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="admin-eyebrow">الطلاب</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">الطلاب والفريق</h1>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <section>
        <h2 className="mb-3 text-lg font-black text-slate-950">الطلاب ({students.length})</h2>
        <div className="admin-surface overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-bold">الاسم</th>
                <th className="px-4 py-3 font-bold">البريد</th>
                <th className="px-4 py-3 font-bold">الصف</th>
                <th className="px-4 py-3 font-bold">سلسلة الأيام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-semibold text-slate-950">{s.displayName}</td>
                  <td className="px-4 py-3 text-slate-600">{s.email}</td>
                  <td className="px-4 py-3 text-slate-600">{s.gradeName || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{s.currentStreak ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {students.length === 0 && <p className="p-5 text-sm text-slate-500">لا يوجد طلاب مسجَّلون بعد.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-black text-slate-950">الفريق والصلاحيات ({staff.length})</h2>
        <div className="admin-surface overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-bold">الاسم</th>
                <th className="px-4 py-3 font-bold">البريد</th>
                <th className="px-4 py-3 font-bold">الدور</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-semibold text-slate-950">{u.displayName}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.role === "super_admin" ? (
                      <span className="text-xs font-bold text-slate-400">مدير أعلى (ثابت)</span>
                    ) : (
                      <select
                        value={u.role}
                        disabled={busyId === u.id}
                        onChange={(e) => changeRole(u.id, e.target.value as Role)}
                      >
                        {[...STAFF_ROLES, "student" as Role].map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {staff.length === 0 && <p className="p-5 text-sm text-slate-500">لا يوجد أعضاء فريق غير الطلاب بعد.</p>}
        </div>
      </section>
    </div>
  );
}
