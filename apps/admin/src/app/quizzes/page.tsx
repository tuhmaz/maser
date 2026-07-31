"use client";

import { useEffect, useState } from "react";
import { FileQuestion, RefreshCw } from "lucide-react";
import type { AdminQuiz } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "@/components/AdminPageHeader";

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<AdminQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api.adminListQuizzes()
      .then(setQuizzes)
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب الاختبارات"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="التقييم"
        title="اختبارات الدروس"
        description="تُنشأ تلقائياً عند نشر أول سؤال في الدرس، ويعرض العدد الحالي للأسئلة المنشورة فعلياً."
        actions={<Button variant="secondary" onClick={load} disabled={loading}><RefreshCw size={17} className={loading ? "animate-spin" : ""} /> تحديث</Button>}
      />

      {error && <p role="alert" className="admin-error">{error}</p>}

      {quizzes.length === 0 && !loading ? (
        <AdminEmptyState title="لا توجد اختبارات بعد" description="انشر أول سؤال في درس ليُنشأ اختباره تلقائياً." icon={<FileQuestion size={30} />} />
      ) : (
        <section className="admin-surface overflow-hidden">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>الاختبار</th><th>الدرس</th><th>عدد الأسئلة</th><th>الجاهزية</th></tr></thead>
              <tbody className="divide-y divide-[#edf1f6]">
                {quizzes.map((quiz) => (
                  <tr key={quiz.id}>
                    <td className="font-black text-[#12213f]">{quiz.title}</td>
                    <td className="text-[#526078]">{quiz.lessonName}</td>
                    <td className="font-black text-[#12213f]">{quiz.questionCount.toLocaleString("ar")}</td>
                    <td><AdminStatusBadge label={quiz.questionCount > 0 ? "جاهز" : "بلا أسئلة"} tone={quiz.questionCount > 0 ? "success" : "warning"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
