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
      router.push("/today");
    } catch (err: any) {
      setError(err?.message ?? "تعذّر إكمال التهيئة، حاول مجددًا");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold">تهيئة حسابك</h1>

      <section>
        <h2 className="mb-2 font-medium">اختر صفك</h2>
        <div className="flex flex-wrap gap-2">
          {grades.map((g) => (
            <button
              key={g.id}
              onClick={() => setGradeId(g.id)}
              className={`rounded-lg border px-4 py-2 ${gradeId === g.id ? "border-blue-600 bg-blue-50" : ""}`}
            >
              {g.name}
            </button>
          ))}
          {grades.length === 0 && <p className="text-sm text-gray-500">لا توجد صفوف متاحة بعد.</p>}
        </div>
      </section>

      {gradeId && (
        <section>
          <h2 className="mb-2 font-medium">اختر مادتك</h2>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => setSubjectId(s.id)}
                className={`rounded-lg border px-4 py-2 ${subjectId === s.id ? "border-blue-600 bg-blue-50" : ""}`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={handleContinue} disabled={loading}>
        {loading ? "جارٍ المتابعة..." : "متابعة إلى الاختبار التشخيصي"}
      </Button>
    </main>
  );
}
