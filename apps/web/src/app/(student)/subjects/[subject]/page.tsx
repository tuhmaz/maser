"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, Circle, Layers3 } from "lucide-react";
import type { Lesson, Unit } from "@alemedu/api-client";
import { api } from "@/lib/api";

export default function SubjectMapPage() {
  const params = useParams<{ subject: string }>();
  const [units, setUnits] = useState<Unit[]>([]);
  const [lessonsByUnit, setLessonsByUnit] = useState<Record<string, Lesson[]>>({});

  useEffect(() => {
    api.listUnits(params.subject).then(setUnits).catch(() => setUnits([]));
  }, [params.subject]);

  useEffect(() => {
    units.forEach((unit) => {
      if (lessonsByUnit[unit.id]) return;
      api
        .listLessons(unit.id)
        .then((lessons) => setLessonsByUnit((current) => ({ ...current, [unit.id]: lessons })))
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units]);

  return (
    <div className="space-y-6 enter-up">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">الرياضيات · الصف السابع</p>
          <h1 className="student-page-title mt-2">الوحدات والدروس</h1>
          <p className="student-page-copy">تقدم عبر الدروس بترتيب مريح، وسنظهر لك ما يحتاج المراجعة.</p>
        </div>
        <span className="status-chip bg-white text-slate-600 shadow-sm">
          <Layers3 size={15} className="text-[#3568e8]" aria-hidden="true" />
          {units.length} وحدات
        </span>
      </header>

      {units.length === 0 && <p className="empty-state">لا توجد وحدات منشورة بعد.</p>}

      <div className="space-y-4">
        {units.map((unit, unitIndex) => {
          const lessons = lessonsByUnit[unit.id] ?? [];
          return (
            <section key={unit.id} className="surface overflow-hidden">
              <div className="flex items-center gap-4 border-b border-[#e7ebf3] bg-[#f9faff] p-5 sm:px-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#edf3ff] font-black text-[#3568e8]">
                  {unitIndex + 1}
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-400">الوحدة {unitIndex + 1}</p>
                  <h2 className="mt-1 text-lg font-black text-slate-950">{unit.name}</h2>
                </div>
              </div>

              {lessons.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">لا توجد دروس منشورة لهذه الوحدة بعد.</p>
              ) : (
                <ol>
                  {lessons.map((lesson, lessonIndex) => (
                    <li key={lesson.id} className="border-b border-[#edf0f5] last:border-b-0">
                      <Link
                        href={`/lessons/${lesson.id}`}
                        className="group flex items-center gap-4 px-5 py-4 transition hover:bg-[#f7f9ff] sm:px-6"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-[#edf3ff] group-hover:text-[#3568e8]">
                          {lessonIndex === 0 ? <CheckCircle2 size={19} aria-hidden="true" /> : <Circle size={17} aria-hidden="true" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-bold text-slate-400">الدرس {lessonIndex + 1}</span>
                          <span className="mt-1 block font-bold text-slate-800">{lesson.name}</span>
                        </span>
                        <ArrowLeft className="text-slate-300 transition group-hover:text-[#3568e8]" size={18} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
