"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookCopy, BookOpen, Boxes, GraduationCap, RefreshCw } from "lucide-react";
import type { AdminLesson, AdminUnit, Grade, Subject } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "@/components/AdminPageHeader";

export default function CurriculumPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Record<string, Subject[]>>({});
  const [units, setUnits] = useState<Record<string, AdminUnit[]>>({});
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const gradeItems = await api.listGrades();
      const lessonItems = await api.adminListLessons();
      const subjectMap: Record<string, Subject[]> = {};
      const unitMap: Record<string, AdminUnit[]> = {};

      for (const grade of gradeItems) {
        const gradeSubjects = await api.listSubjectsForGrade(grade.id);
        subjectMap[grade.id] = gradeSubjects;
        const unitEntries = await Promise.all(
          gradeSubjects.map(async (subject) => [subject.id, await api.adminListUnits(subject.id)] as const),
        );
        unitEntries.forEach(([subjectId, subjectUnits]) => { unitMap[subjectId] = subjectUnits; });
      }

      setGrades(gradeItems);
      setLessons(lessonItems);
      setSubjects(subjectMap);
      setUnits(unitMap);
    } catch (err: any) {
      setError(err?.message ?? "تعذّر جلب هيكل المنهاج");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => {
    const allSubjects = Object.values(subjects).flat();
    const allUnits = Object.values(units).flat();
    return {
      grades: grades.length,
      subjects: allSubjects.length,
      units: allUnits.length,
      lessons: lessons.length,
    };
  }, [grades, lessons, subjects, units]);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="إدارة المحتوى"
        title="هيكل المنهاج"
        description="عرض مباشر للعلاقات بين الصفوف والمواد والوحدات والدروس. التعديل يتم من الصفحات المتخصصة."
        actions={<Button variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={17} className={loading ? "animate-spin" : ""} /> تحديث</Button>}
      />

      {error && <p role="alert" className="admin-error">{error}</p>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: GraduationCap, label: "الصفوف", value: totals.grades, href: "/grades", color: "bg-[#eaf2ff] text-[#1565d8]" },
          { icon: BookCopy, label: "المواد", value: totals.subjects, href: "/subjects", color: "bg-[#e7f7fb] text-[#087d96]" },
          { icon: Boxes, label: "الوحدات", value: totals.units, href: "/units", color: "bg-[#f0edff] text-[#7357d4]" },
          { icon: BookOpen, label: "الدروس", value: totals.lessons, href: "/lessons", color: "bg-[#e8f7f2] text-[#159b72]" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} className="admin-stat flex items-center gap-4 transition hover:border-[#b9cbea]">
              <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${item.color}`}><Icon size={21} /></span>
              <div><p className="text-xs font-bold text-[#64718a]">{item.label}</p><p className="mt-1 text-2xl font-black text-[#12213f]">{item.value.toLocaleString("ar")}</p></div>
              <ArrowLeft className="mr-auto text-[#9aa6b8]" size={17} />
            </Link>
          );
        })}
      </section>

      {!loading && grades.length === 0 ? (
        <AdminEmptyState title="لا يوجد منهاج بعد" description="ابدأ بإنشاء صف ثم مادة." icon={<GraduationCap size={30} />} />
      ) : (
        <div className="space-y-4">
          {grades.map((grade) => (
            <section key={grade.id} className="admin-surface overflow-hidden">
              <div className="flex items-center justify-between gap-4 border-b border-[#e7ecf3] bg-[#f8faff] px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eaf2ff] text-[#1565d8]"><GraduationCap size={20} /></span>
                  <div><p className="text-xs font-bold text-[#64718a]">المستوى {grade.level}</p><h2 className="mt-1 font-black text-[#12213f]">{grade.name}</h2></div>
                </div>
                <AdminStatusBadge label={`${(subjects[grade.id] ?? []).length} مواد`} tone="info" />
              </div>

              {(subjects[grade.id] ?? []).length === 0 ? (
                <p className="p-5 text-sm text-[#64718a]">لا توجد مواد مرتبطة بهذا الصف.</p>
              ) : (
                <div className="grid gap-0 divide-y divide-[#edf1f6] xl:grid-cols-2 xl:divide-x xl:divide-x-reverse xl:divide-y-0">
                  {(subjects[grade.id] ?? []).map((subject) => (
                    <article key={subject.id} className="p-5">
                      <div className="flex items-center gap-2">
                        <BookCopy size={18} className="text-[#087d96]" />
                        <h3 className="font-black text-[#12213f]">{subject.name}</h3>
                        <span dir="ltr" className="mr-auto font-mono text-[10px] text-[#9aa6b8]">{subject.slug}</span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {(units[subject.id] ?? []).map((unit) => {
                          const unitLessons = lessons.filter((lesson) => lesson.unitId === unit.id);
                          return (
                            <div key={unit.id} className="rounded-lg border border-[#e7ecf3] bg-[#fbfcfe] p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-black text-[#33415c]">{unit.order}. {unit.name}</p>
                                <AdminStatusBadge label={unit.isActive ? "نشطة" : "معطلة"} tone={unit.isActive ? "success" : "neutral"} />
                              </div>
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {unitLessons.map((lesson) => (
                                  <span key={lesson.id} className={`rounded-md px-2 py-1 text-[11px] font-bold ${lesson.isActive ? "bg-white text-[#526078]" : "bg-[#eef1f5] text-[#9aa6b8]"}`}>
                                    {lesson.name}
                                  </span>
                                ))}
                                {unitLessons.length === 0 && <span className="text-xs text-[#9aa6b8]">لا دروس بعد</span>}
                              </div>
                            </div>
                          );
                        })}
                        {(units[subject.id] ?? []).length === 0 && <p className="text-xs text-[#9aa6b8]">لا توجد وحدات لهذه المادة.</p>}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
