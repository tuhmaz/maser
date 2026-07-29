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
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">موادي</h1>
      {subjects.length === 0 ? (
        <p className="text-gray-500">لا توجد مواد بعد.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {subjects.map((s) => (
            <li key={s.id}>
              <Link href={`/subjects/${s.id}`} className="rounded-lg border block px-4 py-3 hover:border-blue-600">
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
