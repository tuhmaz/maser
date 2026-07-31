"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardCheck, RefreshCw, RotateCcw } from "lucide-react";
import type { QuestionSummary } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "@/components/AdminPageHeader";

const DIFFICULTY_LABELS = { easy: "سهل", medium: "متوسط", hard: "صعب" };

export default function ReviewsPage() {
  const [items, setItems] = useState<QuestionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});

  function load() {
    setLoading(true);
    api.adminListReviews()
      .then(setItems)
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب طابور المراجعة"))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function decide(id: string, decision: "approved" | "changes_requested") {
    if (decision === "changes_requested" && !comments[id]?.trim()) {
      setError("اكتب ملاحظة واضحة للمحرر عند طلب التعديل");
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      await api.adminReviewQuestion(id, decision, comments[id]?.trim());
      setComments((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      load();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر حفظ قرار المراجعة");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="ضبط الجودة"
        title="طابور المراجعة"
        description="كل قرار اعتماد أو طلب تعديل ينتقل بالسؤال إلى حالته التالية ويسجل في سجل التدقيق."
        actions={<Button variant="secondary" onClick={load} disabled={loading}><RefreshCw size={17} className={loading ? "animate-spin" : ""} /> تحديث</Button>}
      />

      {error && <p role="alert" className="admin-error">{error}</p>}

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="admin-stat"><p className="text-xs font-bold text-[#64718a]">إجمالي الطابور</p><p className="mt-2 text-2xl font-black text-[#12213f]">{items.length.toLocaleString("ar")}</p></article>
        <article className="admin-stat"><p className="text-xs font-bold text-[#64718a]">بلاغات مرتبطة</p><p className="mt-2 text-2xl font-black text-[#d64f5b]">{items.reduce((sum, item) => sum + item.openReports, 0).toLocaleString("ar")}</p></article>
        <article className="admin-stat"><p className="text-xs font-bold text-[#64718a]">سبق استخدامها</p><p className="mt-2 text-2xl font-black text-[#1565d8]">{items.filter((item) => item.usageCount > 0).length.toLocaleString("ar")}</p></article>
      </section>

      {items.length === 0 && !loading ? (
        <AdminEmptyState title="طابور المراجعة فارغ" description="ستظهر هنا الأسئلة التي يرسلها المحررون للمراجعة." icon={<ClipboardCheck size={30} />} />
      ) : (
        <div className="space-y-3">
          {items.map((question) => (
            <article key={question.id} className="admin-surface overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7ecf3] bg-[#f8faff] px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <AdminStatusBadge label="قيد المراجعة" tone="warning" />
                  <span className="text-xs font-bold text-[#64718a]">{question.lessonName || "دون درس"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <AdminStatusBadge label={DIFFICULTY_LABELS[question.difficulty]} tone={question.difficulty === "hard" ? "danger" : question.difficulty === "medium" ? "warning" : "success"} />
                  {question.openReports > 0 && <AdminStatusBadge label={`${question.openReports} بلاغ`} tone="danger" />}
                </div>
              </div>
              <div className="p-5">
                <p className="font-black leading-8 text-[#12213f]">{question.body}</p>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#64718a]">
                  <span>الاستخدام: <strong className="text-[#33415c]">{question.usageCount.toLocaleString("ar")}</strong></span>
                  <span>نسبة الخطأ: <strong className="text-[#33415c]">{question.errorRate == null ? "غير متاحة" : `${Math.round(question.errorRate * 100)}%`}</strong></span>
                </div>
                <label htmlFor={`review-comment-${question.id}`} className="mt-5 block text-xs font-black text-[#526078]">ملاحظة المراجع</label>
                <textarea
                  id={`review-comment-${question.id}`}
                  rows={2}
                  className="mt-2 w-full resize-y"
                  placeholder="مطلوبة عند طلب التعديل، واختيارية عند الاعتماد"
                  value={comments[question.id] ?? ""}
                  onChange={(event) => setComments((current) => ({ ...current, [question.id]: event.target.value }))}
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button disabled={busyId === question.id} onClick={() => decide(question.id, "approved")}>
                    <CheckCircle2 size={17} />
                    اعتماد السؤال
                  </Button>
                  <Button variant="secondary" disabled={busyId === question.id} onClick={() => decide(question.id, "changes_requested")}>
                    <RotateCcw size={17} />
                    طلب تعديل
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
