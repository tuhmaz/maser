"use client";

import { useEffect, useState } from "react";
import type { AdminQuiz } from "@alemedu/api-client";
import { api } from "@/lib/api";

// اختبارات الدروس تُنشأ تلقائيًا عند نشر أول سؤال في الدرس (بلا حاجة لإدارة يدوية) —
// راجع Publish في services/api/internal/handlers/admin_questions.go. هذه الصفحة للقراءة فقط.
export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<AdminQuiz[]>([]);

  useEffect(() => {
    api.adminListQuizzes().then(setQuizzes).catch(() => setQuizzes([]));
  }, []);

  return (
    <div className="space-y-5">
      <header>
        <p className="admin-eyebrow">الاختبارات</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">اختبارات الدروس</h1>
        <p className="mt-2 max-w-3xl leading-7 text-slate-600">
          تُنشأ تلقائيًا عند نشر أول سؤال في الدرس، وتُضاف إليها الأسئلة المنشورة تباعًا —
          لا حاجة لإنشائها يدويًا.
        </p>
      </header>

      <div className="admin-surface overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-bold">الدرس</th>
              <th className="px-4 py-3 font-bold">عنوان الاختبار</th>
              <th className="px-4 py-3 font-bold">عدد الأسئلة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quizzes.map((q) => (
              <tr key={q.id}>
                <td className="px-4 py-3 font-semibold text-slate-950">{q.lessonName}</td>
                <td className="px-4 py-3 text-slate-600">{q.title}</td>
                <td className="px-4 py-3 text-slate-600">{q.questionCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {quizzes.length === 0 && <p className="p-5 text-sm text-slate-500">لا توجد اختبارات بعد — انشر سؤالًا في درس ليُنشأ اختباره تلقائيًا.</p>}
      </div>
    </div>
  );
}
