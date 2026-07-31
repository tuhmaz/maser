"use client";

import { useEffect, useState } from "react";
import { BookOpen, Pencil, Plus, RefreshCw, Save, X } from "lucide-react";
import type { AdminLesson, AdminUnit, Grade, Subject } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "@/components/AdminPageHeader";

export default function LessonsPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [gradeId, setGradeId] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [units, setUnits] = useState<AdminUnit[]>([]);
  const [unitId, setUnitId] = useState("");
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [order, setOrder] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminLesson | null>(null);
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

  useEffect(() => {
    if (!subjectId) {
      setUnits([]);
      setUnitId("");
      return;
    }
    api.adminListUnits(subjectId).then((items) => {
      setUnits(items);
      setUnitId(items[0]?.id ?? "");
    }).catch((err: any) => setError(err?.message ?? "تعذّر جلب الوحدات"));
  }, [subjectId]);

  function loadLessons(selectedUnitId = unitId) {
    if (!selectedUnitId) {
      setLessons([]);
      return;
    }
    api.adminListLessons(selectedUnitId).then((items) => {
      setLessons(items);
      setOrder(items.length + 1);
    }).catch((err: any) => setError(err?.message ?? "تعذّر جلب الدروس"));
  }
  useEffect(() => { loadLessons(unitId); }, [unitId]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!unitId || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.adminCreateLesson({ unitId, name: name.trim(), summary: summary.trim() || undefined, order });
      setName("");
      setSummary("");
      setShowForm(false);
      loadLessons();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر إنشاء الدرس");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      await api.adminUpdateLesson(editing.id, {
        name: editing.name.trim(),
        summary: editing.summary?.trim() ?? "",
        order: editing.order,
        isActive: editing.isActive,
      });
      setEditing(null);
      loadLessons();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر حفظ الدرس");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="هيكل المنهاج"
        title="الدروس"
        description="إدارة الدروس وترتيبها وحالتها داخل الوحدة المحددة."
        actions={
          <>
            <Button variant="secondary" onClick={() => loadLessons()} disabled={!unitId}><RefreshCw size={17} /> تحديث</Button>
            <Button onClick={() => setShowForm((value) => !value)} disabled={!unitId}><Plus size={17} /> درس جديد</Button>
          </>
        }
      />

      {error && <p role="alert" className="admin-error">{error}</p>}

      <section className="admin-surface grid gap-4 p-4 sm:grid-cols-3">
        <FilterSelect id="lesson-grade" label="الصف" value={gradeId} onChange={setGradeId} items={grades} />
        <FilterSelect id="lesson-subject" label="المادة" value={subjectId} onChange={setSubjectId} items={subjects} />
        <FilterSelect id="lesson-unit" label="الوحدة" value={unitId} onChange={setUnitId} items={units} />
      </section>

      {showForm && (
        <form onSubmit={create} className="admin-surface grid gap-4 p-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_120px_auto] lg:items-end">
          <div><label htmlFor="lesson-name" className="mb-2 block text-xs font-black text-[#526078]">اسم الدرس</label><input id="lesson-name" className="w-full" value={name} onChange={(event) => setName(event.target.value)} required /></div>
          <div><label htmlFor="lesson-summary" className="mb-2 block text-xs font-black text-[#526078]">وصف مختصر</label><input id="lesson-summary" className="w-full" value={summary} onChange={(event) => setSummary(event.target.value)} /></div>
          <div><label htmlFor="lesson-order" className="mb-2 block text-xs font-black text-[#526078]">الترتيب</label><input id="lesson-order" className="w-full" type="number" min={1} value={order} onChange={(event) => setOrder(Number(event.target.value))} /></div>
          <Button type="submit" disabled={saving}>{saving ? "جارٍ الحفظ..." : "حفظ الدرس"}</Button>
        </form>
      )}

      {lessons.length === 0 ? (
        <AdminEmptyState title="لا توجد دروس في هذه الوحدة" icon={<BookOpen size={30} />} />
      ) : (
        <section className="admin-surface overflow-hidden">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>الترتيب</th><th>الدرس</th><th>الوصف</th><th>الحالة</th><th>الإجراءات</th></tr></thead>
              <tbody className="divide-y divide-[#edf1f6]">
                {lessons.map((lesson) => (
                  <tr key={lesson.id}>
                    {editing?.id === lesson.id ? (
                      <>
                        <td><input type="number" min={1} className="w-20" value={editing.order} onChange={(event) => setEditing({ ...editing, order: Number(event.target.value) })} /></td>
                        <td><input className="min-w-48" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></td>
                        <td><input className="min-w-64" value={editing.summary ?? ""} onChange={(event) => setEditing({ ...editing, summary: event.target.value })} /></td>
                        <td><label className="flex items-center gap-2 text-xs font-bold text-[#526078]"><input type="checkbox" checked={editing.isActive} onChange={(event) => setEditing({ ...editing, isActive: event.target.checked })} /> نشط</label></td>
                        <td><div className="flex gap-2"><Button onClick={() => void saveEdit()} disabled={saving}><Save size={16} /> حفظ</Button><Button variant="secondary" onClick={() => setEditing(null)}><X size={16} /> إلغاء</Button></div></td>
                      </>
                    ) : (
                      <>
                        <td className="font-black text-[#1565d8]">{lesson.order}</td>
                        <td className="font-black text-[#12213f]">{lesson.name}</td>
                        <td className="max-w-md text-sm leading-6 text-[#64718a]">{lesson.summary || "—"}</td>
                        <td><AdminStatusBadge label={lesson.isActive ? "نشط" : "معطل"} tone={lesson.isActive ? "success" : "neutral"} /></td>
                        <td><Button variant="secondary" onClick={() => setEditing({ ...lesson })}><Pencil size={16} /> تعديل</Button></td>
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

function FilterSelect({
  id,
  label,
  value,
  onChange,
  items,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: Array<{ id: string; name: string }>;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-black text-[#526078]">{label}</label>
      <select id={id} className="w-full" value={value} onChange={(event) => onChange(event.target.value)}>
        {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </div>
  );
}
