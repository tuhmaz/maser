"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AdminLesson, AdminUnit, Grade, Subject } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";

// نظرة عامة على هيكل المنهاج — docs/curriculum-structure.md.
// خطة التوسع (docs/product-requirements.md §9): صف/مادة جديدة بعد إثبات الاستخدام
// — النموذجان أدناه يفعّلان ذلك دون الحاجة لـ SQL يدوي.
export default function CurriculumPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Record<string, Subject[]>>({});
  const [units, setUnits] = useState<Record<string, AdminUnit[]>>({});
  const [lessons, setLessons] = useState<AdminLesson[]>([]);

  const [gradeName, setGradeName] = useState("");
  const [gradeLevel, setGradeLevel] = useState(8);
  const [subjectGradeId, setSubjectGradeId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectSlug, setSubjectSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.listGrades().then(async (gs) => {
      setGrades(gs);
      if (gs[0] && !subjectGradeId) setSubjectGradeId(gs[0].id);
      for (const g of gs) {
        const ss = await api.listSubjectsForGrade(g.id);
        setSubjects((prev) => ({ ...prev, [g.id]: ss }));
        for (const s of ss) {
          const us = await api.adminListUnits(s.id);
          setUnits((prev) => ({ ...prev, [s.id]: us }));
        }
      }
    });
    api.adminListLessons().then(setLessons);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  async function createGrade(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.adminCreateGrade({ name: gradeName, level: gradeLevel });
      setGradeName("");
      load();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر إنشاء الصف");
    }
  }

  async function createSubject(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.adminCreateSubject({ gradeId: subjectGradeId, name: subjectName, slug: subjectSlug });
      setSubjectName("");
      setSubjectSlug("");
      load();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر إنشاء المادة");
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="admin-eyebrow">المنهاج</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">هيكل المنهاج</h1>
        <p className="mt-2 max-w-3xl leading-7 text-slate-600">
          المرحلة ← الصف ← الفصل ← المادة ← الوحدة ← الدرس ← المهارة. عدّل الوحدات
          والدروس والمهارات من صفحاتها المخصصة.
        </p>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <form onSubmit={createGrade} className="admin-surface flex flex-col gap-3 p-4">
          <h2 className="font-black text-slate-950">إضافة صف (توسع)</h2>
          <input placeholder="اسم الصف (مثال: الصف الثامن)" value={gradeName} onChange={(e) => setGradeName(e.target.value)} required />
          <input type="number" placeholder="المستوى الرقمي" value={gradeLevel} onChange={(e) => setGradeLevel(Number(e.target.value))} min={5} max={12} required />
          <Button type="submit" className="w-fit">إضافة الصف</Button>
        </form>

        <form onSubmit={createSubject} className="admin-surface flex flex-col gap-3 p-4">
          <h2 className="font-black text-slate-950">إضافة مادة (توسع)</h2>
          <select value={subjectGradeId} onChange={(e) => setSubjectGradeId(e.target.value)} required>
            {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <input placeholder="اسم المادة (مثال: العلوم)" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} required />
          <input placeholder="slug (مثال: science)" value={subjectSlug} onChange={(e) => setSubjectSlug(e.target.value)} required />
          <Button type="submit" disabled={!subjectGradeId} className="w-fit">إضافة المادة</Button>
        </form>
      </div>

      {grades.length === 0 && <div className="admin-empty">لا توجد صفوف بعد.</div>}

      <div className="space-y-4">
        {grades.map((g) => (
          <section key={g.id} className="admin-surface p-5">
            <h2 className="text-lg font-black text-slate-950">{g.name}</h2>
            {(subjects[g.id] ?? []).map((s) => (
              <div key={s.id} className="mt-3 border-r-2 border-teal-100 pr-4">
                <p className="font-semibold text-teal-800">{s.name}</p>
                <ul className="mt-2 space-y-2">
                  {(units[s.id] ?? []).map((u) => (
                    <li key={u.id} className="border-r-2 border-slate-100 pr-4">
                      <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                      <ul className="mt-1 flex flex-wrap gap-2">
                        {lessons.filter((l) => l.unitId === u.id).map((l) => (
                          <li key={l.id} className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600">{l.name}</li>
                        ))}
                        {lessons.filter((l) => l.unitId === u.id).length === 0 && (
                          <li className="text-xs text-slate-400">لا دروس بعد</li>
                        )}
                      </ul>
                    </li>
                  ))}
                  {(units[s.id] ?? []).length === 0 && <li className="text-xs text-slate-400">لا وحدات بعد</li>}
                </ul>
              </div>
            ))}
            {(subjects[g.id] ?? []).length === 0 && <p className="mt-2 text-xs text-slate-400">لا مواد بعد لهذا الصف</p>}
          </section>
        ))}
      </div>

      <div className="flex gap-3 text-sm">
        <Link href="/units" className="font-semibold text-teal-700 hover:underline">إدارة الوحدات ←</Link>
        <Link href="/lessons" className="font-semibold text-teal-700 hover:underline">إدارة الدروس ←</Link>
        <Link href="/skills" className="font-semibold text-teal-700 hover:underline">إدارة المهارات ←</Link>
      </div>
    </div>
  );
}
