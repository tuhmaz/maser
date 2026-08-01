"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import type { AdminSubjectBook, ImportResult, ImportStructureInput } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";

// نموذج مراجعة/تعديل/استيراد مسودة تحليل الكتاب (docs/ai-curriculum-roadmap.md
// — E10 المرحلة 2). AI يقترح، الأدمن يراجع ويعدّل الأسماء ويستبعد ما لا يريده
// ثم يستورد المُحدَّد فعليًا إلى units/lessons/skills — لا كتابة تلقائية.

interface DraftLesson {
  included: boolean;
  name: string;
  skillsText: string; // مهارة كل سطر — قابلة للتعديل مباشرة كنص
}

interface DraftUnit {
  included: boolean;
  name: string;
  lessons: DraftLesson[];
}

function parseProposedStructure(raw: string | undefined): DraftUnit[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { units?: Array<{ name: string; lessons?: Array<{ name: string; skills?: string[] }> }> };
    return (parsed.units ?? []).map((unit) => ({
      included: true,
      name: unit.name,
      lessons: (unit.lessons ?? []).map((lesson) => ({
        included: true,
        name: lesson.name,
        skillsText: (lesson.skills ?? []).join("\n"),
      })),
    }));
  } catch {
    return [];
  }
}

export function BookAnalysisReviewModal({
  subjectId,
  book,
  bookTypeLabel,
  onClose,
  onImported,
}: {
  subjectId: string;
  book: AdminSubjectBook;
  bookTypeLabel: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [units, setUnits] = useState<DraftUnit[]>(() => parseProposedStructure(book.analysis?.proposedStructure));
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const hasSelection = useMemo(
    () => units.some((u) => u.included && u.lessons.some((l) => l.included)),
    [units],
  );

  function toggleUnit(unitIndex: number) {
    setUnits((prev) => prev.map((u, i) => (i === unitIndex ? { ...u, included: !u.included } : u)));
  }
  function updateUnitName(unitIndex: number, name: string) {
    setUnits((prev) => prev.map((u, i) => (i === unitIndex ? { ...u, name } : u)));
  }
  function toggleLesson(unitIndex: number, lessonIndex: number) {
    setUnits((prev) =>
      prev.map((u, i) =>
        i === unitIndex
          ? { ...u, lessons: u.lessons.map((l, j) => (j === lessonIndex ? { ...l, included: !l.included } : l)) }
          : u,
      ),
    );
  }
  function updateLessonName(unitIndex: number, lessonIndex: number, name: string) {
    setUnits((prev) =>
      prev.map((u, i) =>
        i === unitIndex
          ? { ...u, lessons: u.lessons.map((l, j) => (j === lessonIndex ? { ...l, name } : l)) }
          : u,
      ),
    );
  }
  function updateLessonSkills(unitIndex: number, lessonIndex: number, skillsText: string) {
    setUnits((prev) =>
      prev.map((u, i) =>
        i === unitIndex
          ? { ...u, lessons: u.lessons.map((l, j) => (j === lessonIndex ? { ...l, skillsText } : l)) }
          : u,
      ),
    );
  }

  async function handleImport() {
    setImporting(true);
    setError(null);
    try {
      const input: ImportStructureInput = {
        units: units
          .filter((u) => u.included && u.name.trim())
          .map((u) => ({
            name: u.name.trim(),
            lessons: u.lessons
              .filter((l) => l.included && l.name.trim())
              .map((l) => ({
                name: l.name.trim(),
                skills: l.skillsText.split("\n").map((s) => s.trim()).filter(Boolean),
              })),
          }))
          .filter((u) => u.lessons.length > 0),
      };
      const res = await api.adminImportBookAnalysis(subjectId, book.id, input);
      setResult(res);
      onImported();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر الاستيراد");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="admin-surface flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#e7ecf3] p-4">
          <h3 className="font-black text-[#12213f]">مراجعة التحليل المقترح — {bookTypeLabel}</h3>
          <button type="button" onClick={onClose} className="text-[#9aa6b8] hover:text-[#12213f]" aria-label="إغلاق"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <p className="mb-3 text-xs text-[#64718a]">
            راجع الوحدات والدروس المقترحة من AI، عدّل الأسماء أو استبعد ما لا تريده، ثم استورد المُحدَّد فعليًا
            إلى المنهاج. استيراد نفس الاسم مرة أخرى لا يُنشئ تكرارًا.
          </p>

          {book.analysis?.importedAt && (
            <p className="mb-3 rounded-lg bg-[#eaf2ff] p-2 text-xs font-bold text-[#1565d8]">
              استُورِد هذا التحليل سابقًا بتاريخ {new Date(book.analysis.importedAt).toLocaleString("ar")}
            </p>
          )}

          {error && <p role="alert" className="admin-error mb-3">{error}</p>}

          {result ? (
            <div className="flex items-center gap-2 rounded-lg bg-[#e8f7f2] p-4 text-sm font-bold text-[#159b72]">
              <CheckCircle2 size={18} />
              تم الاستيراد: {result.importedUnits} وحدة جديدة، {result.importedLessons} درس جديد، {result.importedSkills} مهارة جديدة.
            </div>
          ) : units.length === 0 ? (
            <p className="text-xs text-[#9aa6b8]">لا يوجد هيكل مقترَح لعرضه.</p>
          ) : (
            <div className="space-y-4">
              {units.map((unit, ui) => (
                <div key={ui} className="rounded-lg border border-[#e7ecf3] p-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={unit.included} onChange={() => toggleUnit(ui)} />
                    <input
                      className="flex-1 font-black"
                      value={unit.name}
                      onChange={(e) => updateUnitName(ui, e.target.value)}
                      disabled={!unit.included}
                    />
                  </label>
                  {unit.included && (
                    <div className="mt-3 space-y-3 pr-6">
                      {unit.lessons.map((lesson, li) => (
                        <div key={li} className="rounded-lg bg-[#fbfcfe] p-3">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" checked={lesson.included} onChange={() => toggleLesson(ui, li)} />
                            <input
                              className="flex-1 text-sm font-bold"
                              value={lesson.name}
                              onChange={(e) => updateLessonName(ui, li, e.target.value)}
                              disabled={!lesson.included}
                            />
                          </label>
                          {lesson.included && (
                            <textarea
                              className="mt-2 w-full resize-y text-xs"
                              rows={3}
                              value={lesson.skillsText}
                              onChange={(e) => updateLessonSkills(ui, li, e.target.value)}
                              placeholder="مهارة واحدة في كل سطر"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#e7ecf3] p-4">
          <Button variant="secondary" onClick={onClose}>{result ? "إغلاق" : "إلغاء"}</Button>
          {!result && (
            <Button onClick={handleImport} disabled={importing || !hasSelection}>
              {importing ? "جارٍ الاستيراد..." : "استيراد المحدَّد"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
