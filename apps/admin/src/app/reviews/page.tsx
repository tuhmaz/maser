"use client";

import { useEffect, useState } from "react";
import type { QuestionSummary } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";

// طابور مراجعة الأسئلة — "المراجعات" ليست كيانًا منفصلاً، هي أسئلة بحالة in_review
// (docs/user-journeys.md: المراجع التعليمي يراجع دقة السؤال والحل والتفسير قبل النشر).
export default function ReviewsPage() {
  const [items, setItems] = useState<QuestionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});

  function load() {
    api.adminListReviews().then(setItems).catch(() => setItems([]));
  }
  useEffect(load, []);

  async function decide(id: string, decision: "approved" | "changes_requested") {
    setBusyId(id);
    setError(null);
    try {
      await api.adminReviewQuestion(id, decision, comments[id]);
      load();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر حفظ قرار المراجعة");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="admin-eyebrow">المراجعة التربوية</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">طابور المراجعة</h1>
        <p className="mt-2 max-w-3xl leading-7 text-slate-600">
          يراجع المحتوى التربوي دقة السؤال والحل والتفسير قبل السماح بنشره.
        </p>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {items.length === 0 && <div className="admin-empty">لا توجد أسئلة قيد المراجعة حاليًا.</div>}

      <div className="space-y-3">
        {items.map((q) => (
          <article key={q.id} className="admin-surface p-5">
            <p className="text-xs font-semibold text-teal-700">{q.lessonName}</p>
            <p className="mt-1 font-semibold text-slate-950">{q.body}</p>

            <input
              className="mt-3 w-full"
              placeholder="ملاحظة للمحرر (اختياري)"
              value={comments[q.id] ?? ""}
              onChange={(e) => setComments((prev) => ({ ...prev, [q.id]: e.target.value }))}
            />

            <div className="mt-3 flex gap-2">
              <Button disabled={busyId === q.id} onClick={() => decide(q.id, "approved")}>اعتماد</Button>
              <Button variant="secondary" disabled={busyId === q.id} onClick={() => decide(q.id, "changes_requested")}>
                طلب تعديل
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
