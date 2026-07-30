"use client";

import { useEffect, useState } from "react";
import type { AdminUnit, Grade, Subject } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";

// إدارة وحدات المادة — docs/database-design.md: جدول units.
export default function UnitsPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<string>("");
  const [units, setUnits] = useState<AdminUnit[]>([]);
  const [name, setName] = useState("");
  const [order, setOrder] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminUnit | null>(null);

  useEffect(() => {
    api.listGrades().then((gs) => {
      setGrades(gs);
      if (gs[0]) api.listSubjectsForGrade(gs[0].id).then((ss) => {
        setSubjects(ss);
        if (ss[0]) setSubjectId(ss[0].id);
      });
    });
  }, []);

  function loadUnits(sid: string) {
    if (!sid) return;
    api.adminListUnits(sid).then(setUnits).catch(() => setUnits([]));
  }

  useEffect(() => loadUnits(subjectId), [subjectId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.adminCreateUnit({ subjectId, name, order });
      setName("");
      setOrder(units.length + 2);
      loadUnits(subjectId);
    } catch (err: any) {
      setError(err?.message ?? "تعذّر إنشاء الوحدة");
    }
  }

  async function handleSaveEdit() {
    if (!editing) return;
    setError(null);
    try {
      await api.adminUpdateUnit(editing.id, { name: editing.name, order: editing.order, isActive: editing.isActive });
      setEditing(null);
      loadUnits(subjectId);
    } catch (err: any) {
      setError(err?.message ?? "تعذّر حفظ التعديل");
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="admin-eyebrow">المنهاج</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">الوحدات</h1>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold text-slate-600">المادة:</label>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="min-w-[10rem]">
          {grades.length === 0 && <option>—</option>}
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <form onSubmit={handleCreate} className="admin-surface flex flex-wrap items-end gap-3 p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">اسم الوحدة</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="w-64" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">الترتيب</label>
          <input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} className="w-20" />
        </div>
        <Button type="submit" disabled={!subjectId}>إضافة وحدة</Button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="admin-surface overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-bold">الاسم</th>
              <th className="px-4 py-3 font-bold">الترتيب</th>
              <th className="px-4 py-3 font-bold">الحالة</th>
              <th className="px-4 py-3 font-bold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {units.map((u) => (
              <tr key={u.id}>
                {editing?.id === u.id ? (
                  <>
                    <td className="px-4 py-2"><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></td>
                    <td className="px-4 py-2"><input type="number" className="w-16" value={editing.order} onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} /></td>
                    <td className="px-4 py-2">
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
                        نشطة
                      </label>
                    </td>
                    <td className="flex gap-2 px-4 py-2">
                      <Button onClick={handleSaveEdit}>حفظ</Button>
                      <Button variant="secondary" onClick={() => setEditing(null)}>إلغاء</Button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-semibold text-slate-950">{u.name}</td>
                    <td className="px-4 py-3 text-slate-600">{u.order}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-bold ${u.isActive ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-500"}`}>
                        {u.isActive ? "نشطة" : "معطّلة"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="secondary" onClick={() => setEditing(u)}>تعديل</Button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {units.length === 0 && <p className="p-5 text-sm text-slate-500">لا توجد وحدات بعد.</p>}
      </div>
    </div>
  );
}
