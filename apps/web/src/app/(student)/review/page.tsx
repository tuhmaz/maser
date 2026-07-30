"use client";

import { useEffect, useState } from "react";
import type { MistakeItem } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";

// /review: المراجعة المجدولة — دورة "خطأ جديد → مراجعة قريبة → مراجعة لاحقة → اختبار تثبيت → متقن"
// (docs/mastery-model.md). عرض ذاتي: الطالب يقيّم نفسه فيُعاد جدولة الخطأ عبر
// POST /mistakes/{id}/review — لا يُغرق الطالب بعشرات الأخطاء في جلسة واحدة.
export default function ReviewPage() {
  const [queue, setQueue] = useState<MistakeItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);

  useEffect(() => {
    api
      .dueMistakes()
      .then(setQueue)
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب المراجعات المستحقة"));
  }, []);

  async function handleAnswer(mistakeId: string, correct: boolean) {
    setSubmittingId(mistakeId);
    try {
      await api.reviewMistake(mistakeId, correct);
      setQueue((prev) => prev?.filter((m) => m.id !== mistakeId) ?? null);
    } catch (err: any) {
      setError(err?.message ?? "تعذّر تسجيل المراجعة");
    } finally {
      setSubmittingId(null);
      setRevealedId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">المراجعة المجدولة</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">مراجعة في الوقت المناسب</h1>
        <p className="mt-2 max-w-2xl leading-7 text-slate-600">
          دورة خطأ جديد، مراجعة قريبة، مراجعة لاحقة، ثم اختبار تثبيت دون إغراق الطالب.
        </p>
      </header>

      <div className="surface grid gap-3 p-5 sm:grid-cols-4 sm:p-6">
        {["خطأ جديد", "مراجعة قريبة", "مراجعة لاحقة", "متقن"].map((step) => (
          <div key={step} className="rounded-md bg-slate-50 p-4 text-sm font-bold text-slate-700">
            {step}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {queue && queue.length === 0 && (
        <div className="empty-state">لا توجد مراجعات مستحقة الآن — عد لاحقًا حسب موعد كل خطأ.</div>
      )}

      <div className="space-y-3">
        {queue?.map((m) => {
          const revealed = revealedId === m.id;
          return (
            <article key={m.id} className="surface p-5">
              <p className="text-xs font-semibold text-teal-700">{m.skillName}</p>
              <p className="mt-1 font-semibold text-slate-950">{m.questionBody}</p>

              {!revealed ? (
                <Button className="mt-4" variant="secondary" onClick={() => setRevealedId(m.id)}>
                  حاول تذكّر الحل، ثم اضغط هنا
                </Button>
              ) : (
                <div className="mt-4 flex flex-wrap gap-3">
                  <p className="w-full text-sm text-slate-500">هل أجبت بشكل صحيح هذه المرة؟</p>
                  <Button
                    disabled={submittingId === m.id}
                    onClick={() => handleAnswer(m.id, true)}
                  >
                    أجبت صح
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={submittingId === m.id}
                    onClick={() => handleAnswer(m.id, false)}
                  >
                    ما زلت أخطئ
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
