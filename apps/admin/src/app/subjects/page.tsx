"use client";

import { useEffect, useState } from "react";
import { BookCopy, Plus, RefreshCw } from "lucide-react";
import type { AdminGrade, Subject } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";
import { AdminEmptyState, AdminPageHeader } from "@/components/AdminPageHeader";

export default function AdminSubjectsPage() {
  const [grades, setGrades] = useState<AdminGrade[]>([]);
  const [gradeId, setGradeId] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadGrades() {
    setLoading(true);
    api.adminListGrades()
      .then((items) => {
        setGrades(items);
        setGradeId((current) => current || items[0]?.id || "");
      })
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب الصفوف"))
      .finally(() => setLoading(false));
  }

  function loadSubjects(selectedGradeId = gradeId) {
    if (!selectedGradeId) {
      setSubjects([]);
      return;
    }
    api.listSubjectsForGrade(selectedGradeId)
      .then(setSubjects)
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب المواد"));
  }

  useEffect(loadGrades, []);
  useEffect(() => { loadSubjects(gradeId); }, [gradeId]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!gradeId || !name.trim() || !slug.trim()) {
      setError("اختر الصف وأدخل اسم المادة والرمز");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.adminCreateSubject({ gradeId, name: name.trim(), slug: slug.trim().toLowerCase() });
      setName("");
      setSlug("");
      setShowForm(false);
      loadSubjects();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر إنشاء المادة");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="هيكل المنهاج"
        title="المواد"
        description="المواد مرتبطة بصف محدد. الإضافة هنا تنشئ مادة حقيقية يمكن ربط الوحدات بها."
        actions={
          <>
            <Button variant="secondary" onClick={() => loadSubjects()} disabled={!gradeId}><RefreshCw size={17} /> تحديث</Button>
            <Button onClick={() => setShowForm((value) => !value)} disabled={!gradeId}><Plus size={17} /> مادة جديدة</Button>
          </>
        }
      />

      {error && <p role="alert" className="admin-error">{error}</p>}

      <div className="flex items-center gap-3">
        <label htmlFor="subject-grade" className="text-sm font-black text-[#33415c]">الصف</label>
        <select id="subject-grade" value={gradeId} onChange={(event) => setGradeId(event.target.value)} className="min-w-52">
          {grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}
        </select>
      </div>

      {showForm && (
        <form onSubmit={create} className="admin-surface grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_minmax(200px,0.7fr)_auto] md:items-end">
          <div>
            <label htmlFor="subject-name" className="mb-2 block text-sm font-black text-[#33415c]">اسم المادة</label>
            <input id="subject-name" className="w-full" value={name} onChange={(event) => setName(event.target.value)} placeholder="الرياضيات" />
          </div>
          <div>
            <label htmlFor="subject-slug" className="mb-2 block text-sm font-black text-[#33415c]">الرمز التقني</label>
            <input id="subject-slug" dir="ltr" className="w-full text-left" value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="mathematics" />
          </div>
          <Button type="submit" disabled={saving}>{saving ? "جارٍ الحفظ..." : "حفظ المادة"}</Button>
        </form>
      )}

      {subjects.length === 0 && !loading ? (
        <AdminEmptyState title="لا توجد مواد لهذا الصف" description="أضف أول مادة لبدء إنشاء الوحدات والدروس." icon={<BookCopy size={30} />} />
      ) : (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => (
            <article key={subject.id} className="admin-surface flex items-center gap-4 p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#eaf2ff] text-[#1565d8]"><BookCopy size={21} /></span>
              <div className="min-w-0">
                <h2 className="font-black text-[#12213f]">{subject.name}</h2>
                <p dir="ltr" className="mt-1 truncate text-left font-mono text-xs text-[#7b879c]">{subject.slug}</p>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
