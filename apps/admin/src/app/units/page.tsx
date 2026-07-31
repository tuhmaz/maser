"use client";

import { useEffect, useState } from "react";
import { Boxes, Pencil, Plus, RefreshCw, Save, X } from "lucide-react";
import type { AdminUnit, Grade, Subject } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "@/components/AdminPageHeader";

export default function UnitsPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [gradeId, setGradeId] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [units, setUnits] = useState<AdminUnit[]>([]);
  const [name, setName] = useState("");
  const [order, setOrder] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminUnit | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listGrades().then((items) => {
      setGrades(items);
      setGradeId(items[0]?.id ?? "");
    }).catch((err: any) => setError(err?.message ?? "تعذّر جلب الصفوف"));
  }, []);

  useEffect(() => {
    if (!gradeId) return;
    api.listSubjectsForGrade(gradeId).then((items) => {
      setSubjects(items);
      setSubjectId(items[0]?.id ?? "");
    }).catch((err: any) => setError(err?.message ?? "تعذّر جلب المواد"));
  }, [gradeId]);

  function loadUnits(selectedSubjectId = subjectId) {
    if (!selectedSubjectId) {
      setUnits([]);
      return;
    }
    api.adminListUnits(selectedSubjectId)
      .then((items) => {
        setUnits(items);
        setOrder(items.length + 1);
      })
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب الوحدات"));
  }
  useEffect(() => { loadUnits(subjectId); }, [subjectId]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!subjectId || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.adminCreateUnit({ subjectId, name: name.trim(), order });
      setName("");
      setShowForm(false);
      loadUnits();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر إنشاء الوحدة");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      await api.adminUpdateUnit(editing.id, { name: editing.name.trim(), order: editing.order, isActive: editing.isActive });
      setEditing(null);
      loadUnits();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر حفظ الوحدة");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="هيكل المنهاج"
        title="الوحدات"
        description="إنشاء الوحدات وتعديل ترتيبها وحالتها ضمن المادة المحددة."
        actions={
          <>
            <Button variant="secondary" onClick={() => loadUnits()} disabled={!subjectId}><RefreshCw size={17} /> تحديث</Button>
            <Button onClick={() => setShowForm((value) => !value)} disabled={!subjectId}><Plus size={17} /> وحدة جديدة</Button>
          </>
        }
      />

      {error && <p role="alert" className="admin-error">{error}</p>}

      <section className="admin-surface flex flex-wrap gap-4 p-4">
        <div>
          <label htmlFor="unit-grade" className="mb-2 block text-xs font-black text-[#526078]">الصف</label>
          <select id="unit-grade" value={gradeId} onChange={(event) => setGradeId(event.target.value)} className="min-w-48">
            {grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="unit-subject" className="mb-2 block text-xs font-black text-[#526078]">المادة</label>
          <select id="unit-subject" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="min-w-48">
            {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </div>
      </section>

      {showForm && (
        <form onSubmit={create} className="admin-surface grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_140px_auto] md:items-end">
          <div><label htmlFor="unit-name" className="mb-2 block text-xs font-black text-[#526078]">اسم الوحدة</label><input id="unit-name" className="w-full" value={name} onChange={(event) => setName(event.target.value)} required /></div>
          <div><label htmlFor="unit-order" className="mb-2 block text-xs font-black text-[#526078]">الترتيب</label><input id="unit-order" className="w-full" type="number" min={1} value={order} onChange={(event) => setOrder(Number(event.target.value))} /></div>
          <Button type="submit" disabled={saving}>{saving ? "جارٍ الحفظ..." : "حفظ الوحدة"}</Button>
        </form>
      )}

      {units.length === 0 ? (
        <AdminEmptyState title="لا توجد وحدات لهذه المادة" icon={<Boxes size={30} />} />
      ) : (
        <section className="admin-surface overflow-hidden">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>الترتيب</th><th>اسم الوحدة</th><th>الحالة</th><th>الإجراءات</th></tr></thead>
              <tbody className="divide-y divide-[#edf1f6]">
                {units.map((unit) => (
                  <tr key={unit.id}>
                    {editing?.id === unit.id ? (
                      <>
                        <td><input type="number" min={1} className="w-20" value={editing.order} onChange={(event) => setEditing({ ...editing, order: Number(event.target.value) })} /></td>
                        <td><input className="w-full min-w-64" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></td>
                        <td><label className="flex items-center gap-2 text-xs font-bold text-[#526078]"><input type="checkbox" checked={editing.isActive} onChange={(event) => setEditing({ ...editing, isActive: event.target.checked })} /> نشطة</label></td>
                        <td><div className="flex gap-2"><Button onClick={() => void saveEdit()} disabled={saving}><Save size={16} /> حفظ</Button><Button variant="secondary" onClick={() => setEditing(null)}><X size={16} /> إلغاء</Button></div></td>
                      </>
                    ) : (
                      <>
                        <td className="font-black text-[#1565d8]">{unit.order}</td>
                        <td className="font-black text-[#12213f]">{unit.name}</td>
                        <td><AdminStatusBadge label={unit.isActive ? "نشطة" : "معطلة"} tone={unit.isActive ? "success" : "neutral"} /></td>
                        <td><Button variant="secondary" onClick={() => setEditing({ ...unit })}><Pencil size={16} /> تعديل</Button></td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
