"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AdminLesson, AdminUnit, Grade, Subject } from "@alemedu/api-client";
import { api } from "@/lib/api";

// نظرة عامة على هيكل المنهاج — docs/curriculum-structure.md.
// إنشاء صفوف/مواد جديدة مؤجَّل لمرحلة التوسع؛ الوحدات والدروس تُدارَان من صفحاتهما.
export default function CurriculumPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Record<string, Subject[]>>({});
  const [units, setUnits] = useState<Record<string, AdminUnit[]>>({});
  const [lessons, setLessons] = useState<AdminLesson[]>([]);

  useEffect(() => {
    api.listGrades().then(async (gs) => {
      setGrades(gs);
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
  }, []);

  return (
    <div className="space-y-5">
      <header>
        <p className="admin-eyebrow">المنهاج</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">هيكل المنهاج</h1>
        <p className="mt-2 max-w-3xl leading-7 text-slate-600">
          المرحلة ← الصف ← الفصل ← المادة ← الوحدة ← الدرس ← المهارة. إضافة صفوف/مواد جديدة
          مؤجَّلة لمرحلة التوسع (docs/product-requirements.md). عدّل الوحدات والدروس من صفحاتهما المخصصة.
        </p>
      </header>

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
