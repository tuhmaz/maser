"use client";

import { useEffect, useMemo, useState } from "react";
import type { MistakeItem } from "@alemedu/api-client";
import { api } from "@/lib/api";

// /mistakes: دفتر الأخطاء — docs/mastery-model.md
// المراجعة الفعلية (تسجيل صح/خطأ) تتم في /review؛ هذه الصفحة عرض شامل فقط.
export default function MistakesPage() {
  const [items, setItems] = useState<MistakeItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listMistakes()
      .then(setItems)
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب دفتر الأخطاء"));
  }, []);

  const dueToday = useMemo(() => items?.filter((m) => m.nextReviewAt && new Date(m.nextReviewAt) <= new Date()).length ?? 0, [items]);
  const repeated = useMemo(() => items?.filter((m) => m.mistakeCount > 1).length ?? 0, [items]);
  const weakSkills = useMemo(() => new Set(items?.map((m) => m.skillName)).size, [items]);

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">دفتر الأخطاء</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">الأخطاء تتحول إلى خطة</h1>
        <p className="mt-2 max-w-2xl leading-7 text-slate-600">
          لا تعرض الصفحة درجات مبهمة؛ كل خطأ مرتبط بمهارة وموعد مراجعة.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          ["تحتاج مراجعة اليوم", dueToday],
          ["أخطاء متكررة", repeated],
          ["مهارات ضعيفة", weakSkills],
        ].map(([label, value]) => (
          <article key={label as string} className="metric-card">
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
          </article>
        ))}
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {items && items.length === 0 && (
        <div className="empty-state">لا توجد أخطاء محفوظة بعد — كلما أخطأت في اختبار سيظهر هنا للمراجعة.</div>
      )}

      <div className="space-y-3">
        {items?.map((m) => (
          <article key={m.id} className="surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-teal-700">{m.skillName}</p>
                <p className="mt-1 font-semibold text-slate-950">{m.questionBody}</p>
              </div>
              <span className="shrink-0 rounded-md bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                أخطأت {m.mistakeCount} {m.mistakeCount === 1 ? "مرة" : "مرات"}
              </span>
            </div>
            {m.nextReviewAt && (
              <p className="mt-2 text-xs text-slate-400">
                موعد المراجعة القادمة: {new Date(m.nextReviewAt).toLocaleDateString("ar")}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
