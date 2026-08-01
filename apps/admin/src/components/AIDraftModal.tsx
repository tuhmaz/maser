"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import type { AdminLesson, AdminSkill } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";

// نافذة توليد مسودة سؤال عبر Together AI (docs/ai-curriculum-roadmap.md — E05).
// خفيفة عمدًا: تجمع فقط الدرس والمهارات والصعوبة وتوجيهًا اختياريًا — AI يولّد
// النص والخيارات، فلا حاجة لحقول body/options هنا كما في QuestionForm.
export function AIDraftModal({
  lessons,
  skills,
  hierarchyForLesson,
  onGenerated,
  onClose,
}: {
  lessons: AdminLesson[];
  skills: AdminSkill[];
  hierarchyForLesson: (lessonId: string) => { gradeId: string; subjectId: string; unitId: string };
  onGenerated: (questionId: string) => void;
  onClose: () => void;
}) {
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? "");
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [topicHint, setTopicHint] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSkill(id: string) {
    setSkillIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function handleGenerate() {
    setError(null);
    if (!lessonId) {
      setError("اختر الدرس أولاً");
      return;
    }
    if (skillIds.length === 0) {
      setError("اختر مهارة واحدة على الأقل");
      return;
    }
    const hierarchy = hierarchyForLesson(lessonId);
    if (!hierarchy.gradeId || !hierarchy.subjectId || !hierarchy.unitId) {
      setError("تعذّر تحديد الصف والمادة والوحدة من الدرس المحدد");
      return;
    }

    setGenerating(true);
    try {
      const result = await api.adminGenerateAIQuestionDraft({
        ...hierarchy,
        lessonId,
        skillIds,
        difficulty,
        topicHint: topicHint.trim() || undefined,
      });
      onGenerated(result.id);
    } catch (err: any) {
      setError(err?.message ?? "تعذّر توليد المسودة");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="admin-surface w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#e7ecf3] p-5">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[#1565d8]" />
            <h2 className="font-black text-[#12213f]">توليد مسودة سؤال بالذكاء الاصطناعي</h2>
          </div>
          <button type="button" onClick={onClose} className="text-[#9aa6b8] hover:text-[#12213f]" aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-xs text-[#64718a]">
            يولّد AI سؤال اختيار من متعدد بناءً على الدرس والمهارات المحددة، ثم يفتح فورًا
            في نموذج التعديل لمراجعته قبل إرساله للمراجعة أو النشر.
          </p>

          {error && <p role="alert" className="admin-error">{error}</p>}

          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-[#526078]">الدرس</label>
            <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} className="w-full" disabled={generating}>
              {lessons.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-[#526078]">الصعوبة</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)} className="w-full" disabled={generating}>
              <option value="easy">سهلة</option>
              <option value="medium">متوسطة</option>
              <option value="hard">صعبة</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-[#526078]">المهارات المستهدفة</label>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <label
                  key={s.id}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-bold ${
                    skillIds.includes(s.id) ? "border-[#1565d8] bg-[#eaf2ff] text-[#1565d8]" : "border-[#dfe6f1] bg-white text-[#64718a]"
                  }`}
                >
                  <input type="checkbox" className="hidden" checked={skillIds.includes(s.id)} onChange={() => toggleSkill(s.id)} disabled={generating} />
                  {s.name}
                </label>
              ))}
              {skills.length === 0 && <p className="text-xs text-[#9aa6b8]">لا توجد مهارات بعد.</p>}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-[#526078]">توجيه إضافي (اختياري)</label>
            <textarea
              value={topicHint}
              onChange={(e) => setTopicHint(e.target.value)}
              rows={2}
              className="w-full resize-y"
              placeholder="مثال: ركّز على مسائل حياتية عملية"
              disabled={generating}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#e7ecf3] p-5">
          <Button variant="secondary" onClick={onClose} disabled={generating}>إلغاء</Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? "جارٍ التوليد... (قد يستغرق حتى 15 ثانية)" : "توليد"}
          </Button>
        </div>
      </div>
    </div>
  );
}
