"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Lesson, Unit } from "@alemedu/api-client";
import { api } from "@/lib/api";

// /subjects/[subject]: خريطة المادة (وحدات → دروس) — docs/curriculum-structure.md
export default function SubjectMapPage() {
  const params = useParams<{ subject: string }>();
  const [units, setUnits] = useState<Unit[]>([]);
  const [lessonsByUnit, setLessonsByUnit] = useState<Record<string, Lesson[]>>({});

  useEffect(() => {
    api.listUnits(params.subject).then(setUnits).catch(() => setUnits([]));
  }, [params.subject]);

  useEffect(() => {
    units.forEach((u) => {
      if (lessonsByUnit[u.id]) return;
      api
        .listLessons(u.id)
        .then((lessons) => setLessonsByUnit((prev) => ({ ...prev, [u.id]: lessons })))
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units]);

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">خريطة المادة</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">الوحدات والدروس</h1>
      </header>
      {units.length === 0 && <p className="empty-state">لا توجد وحدات بعد.</p>}
      {units.map((unit) => (
        <section key={unit.id} className="surface p-5">
          <h2 className="text-xl font-black text-slate-950">{unit.name}</h2>
          <ul className="mt-4 grid gap-2">
            {(lessonsByUnit[unit.id] ?? []).map((lesson) => (
              <li key={lesson.id}>
                <Link href={`/lessons/${lesson.id}`} className="block rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-white hover:text-teal-800">
                  {lesson.name}
                </Link>
              </li>
            ))}
            {(lessonsByUnit[unit.id] ?? []).length === 0 && (
              <li className="rounded-md border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                لا توجد دروس منشورة لهذه الوحدة بعد.
              </li>
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}
