"use client";

import { useEffect, useState } from "react";
import type { Grade } from "@alemedu/api-client";
import { api } from "@/lib/api";

// قراءة عامة صالحة اليوم (GET /grades)؛ الإنشاء/التعديل يتطلب /admin/curricula/*
export default function GradesPage() {
  const [grades, setGrades] = useState<Grade[]>([]);

  useEffect(() => {
    api.listGrades().then(setGrades).catch(() => setGrades([]));
  }, []);

  return (
    <div className="space-y-5">
      <header>
        <p className="admin-eyebrow">المنهاج</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">الصفوف</h1>
      </header>
      <div className="admin-surface overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-bold">الاسم</th>
              <th className="px-4 py-3 font-bold">المستوى</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {grades.map((g) => (
              <tr key={g.id}>
                <td className="px-4 py-3 font-semibold text-slate-950">{g.name}</td>
                <td className="px-4 py-3 text-slate-600">{g.level}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {grades.length === 0 && <p className="p-5 text-sm text-slate-500">لا توجد صفوف بعد.</p>}
      </div>
    </div>
  );
}
