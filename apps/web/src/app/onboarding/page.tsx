"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@alemedu/ui";
import type { Grade, Subject } from "@alemedu/api-client";
import { api } from "@/lib/api";

// خطوات 4-6 من رحلة الطالب الأولى (docs/user-journeys.md): اختيار الصف والفصل والمادة
export default function OnboardingPage() {
  const router = useRouter();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradeId, setGradeId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.listGrades().then(setGrades).catch(() => setGrades([]));
  }, []);

  useEffect(() => {
    if (!gradeId) return setSubjects([]);
    api.listSubjectsForGrade(gradeId).then(setSubjects).catch(() => setSubjects([]));
  }, [gradeId]);

  async function handleContinue() {
    if (!gradeId || !subjectId) {
      setError("اختر الصف والمادة أولًا");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.completeOnboarding({ gradeId, subjectIds: [subjectId] });
      // بعد التهيئة مباشرة: الاختبار التشخيصي (خطوة 7 من رحلة الطالب الأولى، docs/user-journeys.md)
      const view = await api.startDiagnostic();
      router.push(`/quizzes/${view.attempt.id}`);
    } catch (err: any) {
      setError(err?.message ?? "تعذّر إكمال التهيئة، حاول مجددًا");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="ltr" className="flex min-h-screen items-center justify-center py-10">
      <section dir="rtl" className="surface mx-5 w-[calc(100vw-2.5rem)] max-w-2xl p-6 sm:p-8">
        <p className="eyebrow">الخطوة الأولى</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">تهيئة حسابك</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
          اختر الصف والمادة حتى نجهز الاختبار التشخيصي والمهمة اليومية المناسبة لك.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-md bg-teal-700 px-3 py-2 text-center text-white">الصف</span>
          <span className="rounded-md bg-teal-50 px-3 py-2 text-center text-teal-800">المادة</span>
          <span className="rounded-md bg-slate-100 px-3 py-2 text-center">التشخيص</span>
        </div>

      <section className="mt-7">
        <h2 className="mb-3 font-bold text-slate-950">اختر صفك</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {grades.map((g) => (
            <button
              key={g.id}
              onClick={() => setGradeId(g.id)}
              className={`rounded-md border px-4 py-3 text-right text-sm font-semibold transition ${gradeId === g.id ? "border-teal-700 bg-teal-50 text-teal-900" : "border-slate-200 bg-white hover:border-teal-300"}`}
            >
              {g.name}
            </button>
          ))}
          {grades.length === 0 && <p className="empty-state sm:col-span-2">لا توجد صفوف متاحة بعد.</p>}
        </div>
      </section>

      {gradeId && (
        <section className="mt-7">
          <h2 className="mb-3 font-bold text-slate-950">اختر مادتك</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => setSubjectId(s.id)}
                className={`rounded-md border px-4 py-3 text-right text-sm font-semibold transition ${subjectId === s.id ? "border-amber-500 bg-amber-50 text-slate-950" : "border-slate-200 bg-white hover:border-amber-300"}`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={handleContinue} disabled={loading} className="mt-7 w-full">
        {loading ? "جارٍ المتابعة..." : "متابعة إلى الاختبار التشخيصي"}
      </Button>
      </section>
    </main>
  );
}
