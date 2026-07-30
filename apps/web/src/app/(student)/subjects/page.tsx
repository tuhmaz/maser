"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Subject } from "@alemedu/api-client";
import { api } from "@/lib/api";

// /subjects (الطالب): "موادي" — النسخة الأولى تحتوي مادة واحدة (الرياضيات).
export default function StudentSubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    // نطاق النسخة الأولى مثبَّت: الصف السابع بذرة في 0003_curriculum.up.sql
    api
      .listSubjectsForGrade("00000000-0000-0000-0000-000000000004")
      .then(setSubjects)
      .catch(() => setSubjects([]));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">موادي</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">خريطة التعلم</h1>
        <p className="mt-2 text-slate-600">النسخة الأولى تبدأ بالرياضيات للصف السابع.</p>
      </header>
      {subjects.length === 0 ? (
        <p className="empty-state">لا توجد مواد بعد.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {subjects.map((s) => (
            <li key={s.id}>
              <Link href={`/subjects/${s.id}`} className="surface block p-5 transition hover:border-teal-300 hover:bg-teal-50/50">
                <span className="text-lg font-black text-slate-950">{s.name}</span>
                <span className="mt-2 block text-sm text-slate-500">افتح الوحدات والدروس والمهارات.</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
