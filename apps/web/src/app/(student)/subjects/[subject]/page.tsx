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
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">خريطة المادة</h1>
      {units.length === 0 && <p className="text-gray-500">لا توجد وحدات بعد.</p>}
      {units.map((unit) => (
        <section key={unit.id}>
          <h2 className="mb-2 font-semibold">{unit.name}</h2>
          <ul className="flex flex-col gap-1">
            {(lessonsByUnit[unit.id] ?? []).map((lesson) => (
              <li key={lesson.id}>
                <Link href={`/lessons/${lesson.id}`} className="text-blue-600 hover:underline">
                  {lesson.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
