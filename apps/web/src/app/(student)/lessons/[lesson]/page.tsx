"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpenText, Clock3, Play, Sparkles } from "lucide-react";
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
    <div className="space-y-6 enter-up">
      <article className="surface overflow-hidden">
        <div className="border-b border-[#e7ebf3] bg-[#f9faff] p-5 sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="status-chip bg-[#edf3ff] text-[#244fc2]">
              <BookOpenText size={15} aria-hidden="true" />
              درس
            </span>
            <span className="status-chip bg-white text-slate-500">
              <Clock3 size={15} aria-hidden="true" />
              اقرأ على راحتك
            </span>
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <h1 className="student-page-title">{lesson.name}</h1>
          {lesson.summary ? (
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700">{lesson.summary}</p>
          ) : (
            <p className="mt-5 text-sm text-slate-500">سيظهر شرح هذا الدرس عند نشر المحتوى.</p>
          )}
        </div>
      </article>

      <section className="rounded-lg bg-[#17243d] p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[#8bb0ff]">
            <Sparkles size={24} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-black">تأكد من فهم الفكرة</h2>
            <p className="mt-2 text-sm leading-7 text-white/65">
              {hasQuiz ? "اختبار قصير يوضح لك ما ثبت وما يحتاج مراجعة." : "لا يوجد اختبار منشور لهذا الدرس بعد."}
            </p>
            {error && <p className="mt-2 text-sm font-bold text-rose-300">{error}</p>}
          </div>
        </div>
        <Button disabled={!hasQuiz || starting} onClick={handleStart} className="mt-5 w-full bg-white text-[#244fc2] hover:bg-[#edf3ff] sm:mt-0 sm:w-auto">
          {starting ? <Clock3 size={18} aria-hidden="true" /> : <Play size={18} fill="currentColor" aria-hidden="true" />}
          {starting ? "نجهز الأسئلة..." : "اختبر فهمي"}
          {!starting && <ArrowLeft size={17} aria-hidden="true" />}
        </Button>
      </section>
    </div>
  );
}
