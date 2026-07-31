"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Plus, RefreshCw } from "lucide-react";
import type { AdminGrade } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "@/components/AdminPageHeader";

export default function GradesPage() {
  const [grades, setGrades] = useState<AdminGrade[]>([]);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api.adminListGrades()
      .then(setGrades)
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب الصفوف"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    const numericLevel = Number(level);
    if (!name.trim() || !Number.isInteger(numericLevel) || numericLevel < 1) {
      setError("أدخل اسم الصف ومستوى رقمي صحيح");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.adminCreateGrade({ name: name.trim(), level: numericLevel });
      setName("");
      setLevel("");
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر إنشاء الصف");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="هيكل المنهاج"
        title="الصفوف"
        description="إدارة الصفوف المتاحة للطلاب. الإنشاء يكتب مباشرة في قاعدة بيانات المنهاج."
        actions={
          <>
            <Button variant="secondary" onClick={load} disabled={loading}><RefreshCw size={17} className={loading ? "animate-spin" : ""} /> تحديث</Button>
            <Button onClick={() => setShowForm((value) => !value)}><Plus size={17} /> صف جديد</Button>
          </>
        }
      />

      {error && <p role="alert" className="admin-error">{error}</p>}

      {showForm && (
        <form onSubmit={create} className="admin-surface grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
          <div>
            <label htmlFor="grade-name" className="mb-2 block text-sm font-black text-[#33415c]">اسم الصف</label>
            <input id="grade-name" className="w-full" value={name} onChange={(event) => setName(event.target.value)} placeholder="مثال: الصف الثامن" />
          </div>
          <div>
            <label htmlFor="grade-level" className="mb-2 block text-sm font-black text-[#33415c]">المستوى الرقمي</label>
            <input id="grade-level" className="w-full" type="number" min={1} value={level} onChange={(event) => setLevel(event.target.value)} placeholder="8" />
          </div>
          <Button type="submit" disabled={saving}>{saving ? "جارٍ الحفظ..." : "حفظ الصف"}</Button>
        </form>
      )}

      <section className="admin-surface overflow-hidden">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>الصف</th><th>المستوى</th><th>الحالة</th><th>المعرّف</th></tr></thead>
            <tbody className="divide-y divide-[#edf1f6]">
              {grades.map((grade) => (
                <tr key={grade.id}>
                  <td><span className="flex items-center gap-2 font-black text-[#12213f]"><GraduationCap size={18} className="text-[#1565d8]" />{grade.name}</span></td>
                  <td className="font-bold text-[#526078]">{grade.level}</td>
                  <td><AdminStatusBadge label={grade.isActive ? "نشط" : "غير نشط"} tone={grade.isActive ? "success" : "neutral"} /></td>
                  <td className="font-mono text-xs text-[#7b879c]">{grade.id.slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && grades.length === 0 && <div className="p-5"><AdminEmptyState title="لا توجد صفوف" description="أنشئ أول صف لبدء بناء المنهاج." icon={<GraduationCap size={30} />} /></div>}
      </section>
    </div>
  );
}
