"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Check, GraduationCap, Sparkles } from "lucide-react";
import { Button } from "@alemedu/ui";
import type { Grade, Subject } from "@alemedu/api-client";
import { api } from "@/lib/api";
import { BrandMark } from "@/components/BrandMark";

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
    if (!gradeId) {
      setSubjects([]);
      return;
    }
    api.listSubjectsForGrade(gradeId).then(setSubjects).catch(() => setSubjects([]));
  }, [gradeId]);

  async function handleContinue() {
    if (!gradeId || !subjectId) {
      setError("اختر الصف والمادة أولاً");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.completeOnboarding({ gradeId, subjectIds: [subjectId] });
      const view = await api.startDiagnostic();
      router.push(`/quizzes/${view.attempt.id}`);
    } catch (err: any) {
      setError(err?.message ?? "تعذّر إكمال التهيئة، حاول مجدداً");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <BrandMark />
          <span className="text-xs font-black text-slate-500">الإعداد 1 من 2</span>
        </div>

        <section className="surface overflow-hidden">
          <div className="border-b border-[#e3e8f2] bg-white p-6 sm:p-8">
            <span className="status-chip bg-[#edf3ff] text-[#244fc2]">
              <Sparkles size={15} aria-hidden="true" />
              دقيقة واحدة فقط
            </span>
            <h1 className="mt-4 text-3xl font-black text-slate-950">لنخصص التجربة لك</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              اختر صفك ومادتك. بعدها يبدأ اختبار تشخيصي قصير يحدد نقطة البداية المناسبة.
            </p>
            <div className="mt-6 flex items-center gap-2" aria-label="خطوات الإعداد">
              {["الصف والمادة", "تحديد المستوى"].map((step, index) => (
                <div key={step} className="flex flex-1 items-center gap-2">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${index === 0 ? "bg-[#3568e8] text-white" : "bg-[#e8edf6] text-slate-500"}`}>
                    {index + 1}
                  </span>
                  <span className={`text-xs font-black ${index === 0 ? "text-slate-800" : "text-slate-400"}`}>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-8 bg-[#fbfcff] p-6 sm:p-8 md:grid-cols-2">
            <ChoiceSection icon={GraduationCap} title="ما صفك؟" helper="نستخدمه لعرض المنهاج المناسب.">
              {grades.length === 0 ? (
                <p className="empty-state py-5">لا توجد صفوف متاحة حالياً.</p>
              ) : (
                grades.map((grade) => (
                  <ChoiceButton key={grade.id} selected={gradeId === grade.id} onClick={() => { setGradeId(grade.id); setSubjectId(null); }}>
                    {grade.name}
                  </ChoiceButton>
                ))
              )}
            </ChoiceSection>

            <ChoiceSection icon={BookOpen} title="ما المادة؟" helper="سنبدأ بمادة واحدة للحفاظ على التركيز.">
              {!gradeId ? (
                <p className="rounded-lg border border-dashed border-[#d7deeb] bg-white p-5 text-center text-sm text-slate-500">اختر الصف أولاً</p>
              ) : (
                subjects.map((subject) => (
                  <ChoiceButton key={subject.id} selected={subjectId === subject.id} onClick={() => setSubjectId(subject.id)}>
                    {subject.name}
                  </ChoiceButton>
                ))
              )}
            </ChoiceSection>
          </div>

          <div className="flex flex-col items-stretch gap-3 border-t border-[#e3e8f2] bg-white p-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            {error ? <p role="alert" className="text-sm font-bold text-rose-700">{error}</p> : <p className="text-xs text-slate-500">يمكنك تعديل اختياراتك لاحقاً من الإعدادات.</p>}
            <Button onClick={handleContinue} disabled={loading || !gradeId || !subjectId}>
              {loading ? "نجهز الاختبار..." : "متابعة إلى تحديد المستوى"}
              {!loading && <ArrowLeft size={18} aria-hidden="true" />}
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}

function ChoiceSection({
  icon: Icon,
  title,
  helper,
  children,
}: {
  icon: typeof GraduationCap;
  title: string;
  helper: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#edf3ff] text-[#3568e8]">
          <Icon size={20} aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-12 w-full items-center justify-between rounded-lg border px-4 text-right text-sm font-black transition ${
        selected ? "border-[#3568e8] bg-[#edf3ff] text-[#244fc2]" : "border-[#dfe5f0] bg-white text-slate-700 hover:border-[#b8c8ef]"
      }`}
    >
      {children}
      {selected && <Check size={18} strokeWidth={3} aria-hidden="true" />}
    </button>
  );
}
