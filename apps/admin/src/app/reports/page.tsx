"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BarChart3, Download, FileQuestion, RefreshCw, Users } from "lucide-react";
import type { ReportsOverview } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";
import { AdminEmptyState, AdminPageHeader } from "@/components/AdminPageHeader";

const STATUS_META = [
  ["draft", "مسودة", "#7b879c"],
  ["in_review", "قيد المراجعة", "#d98b17"],
  ["changes_requested", "تحتاج تعديلاً", "#d9604d"],
  ["approved", "معتمدة", "#7357d4"],
  ["published", "منشورة", "#159b72"],
  ["archived", "مؤرشفة", "#9aa5b6"],
] as const;

export default function ReportsPage() {
  const [overview, setOverview] = useState<ReportsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api.adminReportsOverview()
      .then(setOverview)
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب التقارير"))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const totalQuestions = useMemo(
    () => Object.values(overview?.questionsByStatus ?? {}).reduce((sum, count) => sum + count, 0),
    [overview],
  );
  const published = overview?.questionsByStatus.published ?? 0;
  const publicationRate = totalQuestions > 0 ? Math.round((published / totalQuestions) * 100) : 0;

  function exportCsv() {
    if (!overview) return;
    const rows = [
      ["المؤشر", "القيمة"],
      ["إجمالي الطلاب", overview.totalStudents],
      ["متوسط النتيجة", overview.averageScore ?? "غير متاح"],
      ["بلاغات مفتوحة", overview.openContentReports],
      ["أسئلة عالية الخطأ", overview.highErrorQuestions],
      ["محاولات قديمة غير مكتملة", overview.staleIncompleteAttempts],
      ...STATUS_META.map(([key, label]) => [`الأسئلة - ${label}`, overview.questionsByStatus[key] ?? 0]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `alemedu-report-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="التحليلات التشغيلية"
        title="التقارير"
        description="لقطة حالية من قاعدة البيانات. لا تُعرض اتجاهات زمنية لأن نقطة التقارير الحالية لا توفر سلسلة تاريخية."
        actions={
          <>
            <Button variant="secondary" onClick={load} disabled={loading}><RefreshCw size={17} className={loading ? "animate-spin" : ""} /> تحديث</Button>
            <Button variant="secondary" onClick={exportCsv} disabled={!overview}><Download size={17} /> تصدير CSV</Button>
          </>
        }
      />

      {error && <p role="alert" className="admin-error">{error}</p>}

      {overview && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { icon: Users, label: "إجمالي الطلاب", value: overview.totalStudents.toLocaleString("ar"), helper: "طلاب غير محذوفين", color: "bg-[#eaf2ff] text-[#1565d8]" },
              { icon: BarChart3, label: "متوسط النتائج", value: overview.averageScore == null ? "غير متاح" : `${Math.round(overview.averageScore)}%`, helper: "محاولات مسلّمة", color: "bg-[#f0edff] text-[#7357d4]" },
              { icon: AlertTriangle, label: "بلاغات مفتوحة", value: overview.openContentReports.toLocaleString("ar"), helper: "تحتاج معالجة", color: "bg-[#ffeded] text-[#d64f5b]" },
              { icon: FileQuestion, label: "أسئلة عالية الخطأ", value: overview.highErrorQuestions.toLocaleString("ar"), helper: "70% خطأ بعد 5 إجابات", color: "bg-[#fff4e5] text-[#d98b17]" },
            ].map((metric) => {
              const Icon = metric.icon;
              return (
                <article key={metric.label} className="admin-stat flex items-start justify-between gap-4">
                  <div><p className="text-xs font-bold text-[#64718a]">{metric.label}</p><p className="mt-2 text-2xl font-black text-[#12213f]">{metric.value}</p><p className="mt-2 text-[11px] text-[#7b879c]">{metric.helper}</p></div>
                  <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${metric.color}`}><Icon size={20} /></span>
                </article>
              );
            })}
          </section>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <article className="admin-surface p-5">
              <div className="flex items-start justify-between">
                <div><h2 className="font-black text-[#12213f]">الأسئلة حسب الحالة</h2><p className="mt-1 text-xs text-[#64718a]">توزيع جميع عناصر بنك الأسئلة.</p></div>
                <span className="admin-chip bg-[#eef4fd] text-[#1565d8]">{totalQuestions.toLocaleString("ar")} سؤال</span>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {STATUS_META.map(([key, label, color]) => {
                  const count = overview.questionsByStatus[key] ?? 0;
                  const percent = totalQuestions > 0 ? Math.round((count / totalQuestions) * 100) : 0;
                  return (
                    <div key={key} className="rounded-lg border border-[#e7ecf3] p-4">
                      <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-bold text-[#526078]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />{label}</span><strong className="text-[#12213f]">{count.toLocaleString("ar")}</strong></div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf1f6]"><span className="block h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} /></div>
                      <p className="mt-2 text-left text-[10px] font-bold text-[#7b879c]">{percent}%</p>
                    </div>
                  );
                })}
              </div>
            </article>

            <aside className="admin-surface p-5">
              <h2 className="font-black text-[#12213f]">مؤشرات تحتاج انتباهاً</h2>
              <div className="mt-4 space-y-3">
                <Link href="/content-issues" className="flex items-center justify-between rounded-lg bg-[#fff5f5] p-3 text-sm font-bold text-[#b83e49]"><span>بلاغات المحتوى</span><strong>{overview.openContentReports}</strong></Link>
                <Link href="/questions" className="flex items-center justify-between rounded-lg bg-[#fff9ee] p-3 text-sm font-bold text-[#a96608]"><span>أسئلة عالية الخطأ</span><strong>{overview.highErrorQuestions}</strong></Link>
                <div className="flex items-center justify-between rounded-lg bg-[#f3f6fa] p-3 text-sm font-bold text-[#526078]"><span>محاولات قديمة غير مكتملة</span><strong>{overview.staleIncompleteAttempts}</strong></div>
              </div>
              <div className="mt-5 border-t border-[#edf1f6] pt-4">
                <div className="flex items-center justify-between text-xs"><span className="font-bold text-[#64718a]">جاهزية النشر</span><strong className="text-[#159b72]">{publicationRate}%</strong></div>
                <div className="admin-progress mt-2"><span className="bg-[#159b72]" style={{ width: `${publicationRate}%` }} /></div>
              </div>
            </aside>
          </section>
        </>
      )}

      {!loading && !overview && !error && <AdminEmptyState title="لا تتوفر بيانات التقرير" />}
    </div>
  );
}
