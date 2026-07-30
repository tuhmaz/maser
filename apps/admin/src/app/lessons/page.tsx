"use client";

import { useEffect, useState } from "react";
import type { AdminLesson, AdminUnit, Grade, Subject } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";

// إدارة الدروس — docs/database-design.md: جدول lessons.
export default function LessonsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [units, setUnits] = useState<AdminUnit[]>([]);
  const [unitId, setUnitId] = useState("");
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [order, setOrder] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminLesson | null>(null);

  useEffect(() => {
    api.listGrades().then((gs: Grade[]) => {
      if (gs[0]) api.listSubjectsForGrade(gs[0].id).then((ss) => {
        setSubjects(ss);
        if (ss[0]) setSubjectId(ss[0].id);
      });
    });
  }, []);

  useEffect(() => {
    if (!subjectId) return;
    api.adminListUnits(subjectId).then((us) => {
      setUnits(us);
      if (us[0]) setUnitId(us[0].id);
    });
  }, [subjectId]);

  function loadLessons(uid: string) {
    if (!uid) return setLessons([]);
    api.adminListLessons(uid).then(setLessons).catch(() => setLessons([]));
  }

  useEffect(() => loadLessons(unitId), [unitId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.adminCreateLesson({ unitId, name, summary, order });
      setName("");
      setSummary("");
      loadLessons(unitId);
    } catch (err: any) {
      setError(err?.message ?? "تعذّر إنشاء الدرس");
    }
  }

  async function handleSaveEdit() {
    if (!editing) return;
    setError(null);
    try {
      await api.adminUpdateLesson(editing.id, {
        name: editing.name, summary: editing.summary, order: editing.order, isActive: editing.isActive,
      });
      setEditing(null);
      loadLessons(unitId);
    } catch (err: any) {
      setError(err?.message ?? "تعذّر حفظ التعديل");
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="admin-eyebrow">المنهاج</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">الدروس</h1>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold text-slate-600">المادة:</label>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="min-w-[10rem]">
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <label className="text-sm font-semibold text-slate-600">الوحدة:</label>
        <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className="min-w-[10rem]">
          {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      <form onSubmit={handleCreate} className="admin-surface flex flex-wrap items-end gap-3 p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">اسم الدرس</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="w-64" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">وصف مختصر</label>
          <input value={summary} onChange={(e) => setSummary(e.target.value)} className="w-72" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">الترتيب</label>
          <input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} className="w-20" />
        </div>
        <Button type="submit" disabled={!unitId}>إضافة درس</Button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="admin-surface overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-bold">الاسم</th>
              <th className="px-4 py-3 font-bold">الوصف</th>
              <th className="px-4 py-3 font-bold">الترتيب</th>
              <th className="px-4 py-3 font-bold">الحالة</th>
              <th className="px-4 py-3 font-bold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lessons.map((l) => (
              <tr key={l.id}>
                {editing?.id === l.id ? (
                  <>
                    <td className="px-4 py-2"><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></td>
                    <td className="px-4 py-2"><input value={editing.summary ?? ""} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} /></td>
                    <td className="px-4 py-2"><input type="number" className="w-16" value={editing.order} onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} /></td>
                    <td className="px-4 py-2">
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
                        نشط
                      </label>
                    </td>
                    <td className="flex gap-2 px-4 py-2">
                      <Button onClick={handleSaveEdit}>حفظ</Button>
                      <Button variant="secondary" onClick={() => setEditing(null)}>إلغاء</Button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-semibold text-slate-950">{l.name}</td>
                    <td className="px-4 py-3 text-slate-600">{l.summary || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{l.order}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-bold ${l.isActive ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-500"}`}>
                        {l.isActive ? "نشط" : "معطّل"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="secondary" onClick={() => setEditing(l)}>تعديل</Button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {lessons.length === 0 && <p className="p-5 text-sm text-slate-500">لا توجد دروس في هذه الوحدة بعد.</p>}
      </div>
    </div>
  );
}
