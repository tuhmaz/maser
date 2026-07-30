"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Lesson } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";

// /lessons/[lesson]: صفحة الدرس — بطاقة "هل فهمت هذا الدرس؟ اختبر نفسك الآن"
// (docs/analytics-events.md، إعلان alemancenter داخل الدرس مشابه لهذا النمط)
export default function LessonPage() {
  const params = useParams<{ lesson: string }>();
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [hasQuiz, setHasQuiz] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getLesson(params.lesson).then(setLesson).catch(() => setLesson(null));
    api
      .getLessonQuiz(params.lesson)
      .then(() => setHasQuiz(true))
      .catch(() => setHasQuiz(false));
  }, [params.lesson]);

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      const quizRef = await api.getLessonQuiz(params.lesson);
      const view = await api.startQuiz(quizRef.id);
      router.push(`/quizzes/${view.attempt.id}`);
    } catch (err: any) {
      setError(err?.message ?? "تعذّر بدء الاختبار");
      setStarting(false);
    }
  }

  if (!lesson) return <p className="empty-state">جارٍ التحميل...</p>;

  return (
    <div className="space-y-6">
      <article className="surface p-6 sm:p-8">
        <p className="eyebrow">درس</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">{lesson.name}</h1>
        {lesson.summary && <p className="mt-4 max-w-3xl leading-8 text-slate-600">{lesson.summary}</p>}
      </article>

      <div className="surface p-6 text-center">
        <p className="mb-2 text-lg font-black text-slate-950">هل فهمت هذا الدرس؟</p>
        <p className="mb-4 text-sm text-slate-500">
          {hasQuiz ? "اختبار قصير يقيس مهارات هذا الدرس." : "لا يوجد اختبار منشور لهذا الدرس بعد."}
        </p>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <Button disabled={!hasQuiz || starting} onClick={handleStart}>
          {starting ? "جارٍ البدء..." : "اختبر نفسك الآن"}
        </Button>
      </div>
    </div>
  );
}
