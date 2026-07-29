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
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Grades</h1>
      <table className="w-full text-right text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">الاسم</th>
            <th className="py-2">المستوى</th>
          </tr>
        </thead>
        <tbody>
          {grades.map((g) => (
            <tr key={g.id} className="border-b">
              <td className="py-2">{g.name}</td>
              <td className="py-2">{g.level}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {grades.length === 0 && <p className="text-gray-500">لا توجد صفوف بعد.</p>}
    </div>
  );
}
