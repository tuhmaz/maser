"use client";

import { useEffect, useState } from "react";
import type { ReportsOverview } from "@alemedu/api-client";
import { api } from "@/lib/api";

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة", in_review: "قيد المراجعة", changes_requested: "طُلب تعديل",
  approved: "معتمد", published: "منشور", archived: "مؤرشف",
};

// مؤشرات تشغيل أساسية — docs/product-requirements.md §7 (لا يُقاس النجاح بعدد الحسابات فقط).
// تحليلات الأحداث التفصيلية (docs/analytics-events.md) تتطلب بناء لاحقًا؛ هذه لقطة تشغيلية حالية.
export default function ReportsPage() {
  const [overview, setOverview] = useState<ReportsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.adminReportsOverview().then(setOverview).catch((err: any) => setError(err?.message ?? "تعذّر جلب التقارير"));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <p className="admin-eyebrow">التقارير</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">لقطة تشغيلية</h1>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!overview && !error && <p className="text-sm text-slate-500">جارٍ التحميل...</p>}

      {overview && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["إجمالي الطلاب", overview.totalStudents],
              ["متوسط النتيجة", overview.averageScore === null ? "—" : `${Math.round(overview.averageScore)}%`],
              ["بلاغات محتوى مفتوحة", overview.openContentReports],
              ["أسئلة بنسبة خطأ مرتفعة", overview.highErrorQuestions],
            ].map(([label, value]) => (
              <article key={label as string} className="admin-surface p-5">
                <p className="text-sm font-semibold text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
              </article>
            ))}
          </section>

          <section className="admin-surface p-5">
            <h2 className="mb-3 text-lg font-black text-slate-950">الأسئلة حسب الحالة</h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(overview.questionsByStatus).map(([status, count]) => (
                <div key={status} className="rounded-md border border-slate-200 px-4 py-2 text-sm">
                  <span className="font-bold text-slate-950">{count}</span>{" "}
                  <span className="text-slate-500">{STATUS_LABELS[status] ?? status}</span>
                </div>
              ))}
              {Object.keys(overview.questionsByStatus).length === 0 && (
                <p className="text-sm text-slate-500">لا توجد أسئلة بعد.</p>
              )}
            </div>
          </section>

          {overview.staleIncompleteAttempts > 0 && (
            <div className="admin-empty">
              {overview.staleIncompleteAttempts} محاولة اختبار بدأت منذ أكثر من يوم ولم تُسلَّم بعد —
              قد تشير لمشكلة في تجربة إكمال الاختبار.
            </div>
          )}
        </>
      )}
    </div>
  );
}
