"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calculator, Clock3, Map, Sparkles } from "lucide-react";
import type { Subject, User } from "@alemedu/api-client";
import { api } from "@/lib/api";

const MVP_GRADE_ID = "00000000-0000-0000-0000-000000000004";

export default function StudentSubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const user = await api.me();
        const gradeId = (user as User & { gradeId?: string }).gradeId || MVP_GRADE_ID;
        setSubjects(await api.listSubjectsForGrade(gradeId));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "تعذّر جلب مواد الصف.");
        setSubjects([]);
      }
    }
    void load();
  }, []);

  return (
    <div className="space-y-6 enter-up">
      <header>
        <p className="eyebrow">موادي</p>
        <h1 className="student-page-title mt-2">خريطة تعلمك</h1>
        <p className="student-page-copy">استكشف الوحدات بالترتيب أو عد مباشرة إلى المهمة التي اخترناها لك اليوم.</p>
      </header>

      {error && (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </p>
      )}

      {subjects === null ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="student-loading h-44" />
          <div className="student-loading h-44" />
        </div>
      ) : subjects.length === 0 ? (
        <div className="empty-state">
          <Map className="mx-auto mb-3 text-slate-300" size={34} aria-hidden="true" />
          لم تُنشر مواد صفك بعد.
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {subjects.map((subject) => (
            <li key={subject.id}>
              <Link href={`/subjects/${subject.id}`} className="surface interactive-card block overflow-hidden">
                <div className="flex items-start gap-4 p-6">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#edf3ff] text-[#3568e8]">
                    <Calculator size={28} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="status-chip bg-[#e9f8f6] text-[#13827d]">
                      <Sparkles size={14} aria-hidden="true" />
                      متاحة الآن
                    </span>
                    <h2 className="mt-3 text-xl font-black text-slate-950">{subject.name}</h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">وحدات ودروس مرتبة حسب منهاج الصف السابع.</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-[#edf0f5] bg-[#fbfcff] px-6 py-3 text-xs font-bold">
                  <span className="flex items-center gap-2 text-slate-500">
                    <Clock3 size={15} aria-hidden="true" />
                    تقدم حسب المهارات
                  </span>
                  <span className="flex items-center gap-1 text-[#3568e8]">
                    افتح الخريطة
                    <ArrowLeft size={15} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
