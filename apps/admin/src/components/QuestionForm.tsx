"use client";

import { useState } from "react";
import type {
  AdminLesson,
  AdminQuestionOption,
  AdminSkill,
  QuestionDetail,
  QuestionType,
  SaveQuestionInput,
} from "@alemedu/api-client";
import { Button } from "@alemedu/ui";

const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: "اختيار من متعدد",
  true_false: "صح أو خطأ",
  multi_select: "اختيار متعدد (أكثر من إجابة)",
  numeric_input: "إدخال رقم",
  ordering: "ترتيب خطوات",
  matching: "مطابقة (غير مدعومة في الواجهة بعد)",
};

// نموذج إنشاء/تعديل سؤال — docs/question-model.md: قواعد جودة السؤال.
// عند "ordering" ترتيب الخيارات في القائمة هو الترتيب الصحيح (لا حاجة لتحديد isCorrect).
export function QuestionForm({
  lessons,
  skills,
  initial,
  onSubmit,
  onCancel,
}: {
  lessons: AdminLesson[];
  skills: AdminSkill[];
  initial?: QuestionDetail;
  onSubmit: (input: SaveQuestionInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [lessonId, setLessonId] = useState(initial?.lessonId ?? lessons[0]?.id ?? "");
  const [type, setType] = useState<QuestionType>(initial?.type ?? "single_choice");
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? "medium");
  const [expectedTimeSec, setExpectedTimeSec] = useState(initial?.expectedTimeSec ?? 60);
  const [body, setBody] = useState(initial?.body ?? "");
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [options, setOptions] = useState<AdminQuestionOption[]>(
    initial?.options?.length ? initial.options : [
      { text: "", order: 1, isCorrect: false },
      { text: "", order: 2, isCorrect: false },
    ]
  );
  const [numericAnswer, setNumericAnswer] = useState(initial?.numericAnswer ?? "");
  const [tolerance, setTolerance] = useState(initial?.tolerance ?? 0);
  const [skillIds, setSkillIds] = useState<string[]>(initial?.skillIds ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const needsOptions = ["single_choice", "true_false", "multi_select", "ordering"].includes(type);

  function updateOption(index: number, patch: Partial<AdminQuestionOption>) {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }
  function addOption() {
    setOptions((prev) => [...prev, { text: "", order: prev.length + 1, isCorrect: false }]);
  }
  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index).map((o, i) => ({ ...o, order: i + 1 })));
  }
  function toggleSkill(id: string) {
    setSkillIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (skillIds.length === 0) {
      setError("اربط السؤال بمهارة واحدة على الأقل");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        lessonId,
        type,
        difficulty: difficulty as SaveQuestionInput["difficulty"],
        expectedTimeSec,
        body,
        explanation,
        options: needsOptions ? options : undefined,
        numericAnswer: type === "numeric_input" ? numericAnswer : undefined,
        tolerance: type === "numeric_input" ? tolerance : undefined,
        skillIds,
      });
    } catch (err: any) {
      setError(err?.message ?? "تعذّر حفظ السؤال");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-surface flex flex-col gap-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">الدرس</label>
          <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} required>
            {lessons.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">نوع السؤال</label>
          <select value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
            {Object.entries(TYPE_LABELS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">الصعوبة</label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}>
            <option value="easy">سهلة</option>
            <option value="medium">متوسطة</option>
            <option value="hard">صعبة</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">الزمن المتوقع (ثانية)</label>
          <input type="number" value={expectedTimeSec} onChange={(e) => setExpectedTimeSec(Number(e.target.value))} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500">نص السؤال</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={2} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500">تفسير الحل</label>
        <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} />
      </div>

      {needsOptions && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-500">
            الخيارات {type === "ordering" && "(الترتيب هنا هو الترتيب الصحيح)"}
          </label>
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 text-xs text-slate-400">{i + 1}</span>
              <input
                className="flex-1"
                placeholder="نص الخيار"
                value={o.text}
                onChange={(e) => updateOption(i, { text: e.target.value })}
                required
              />
              {type !== "ordering" && (
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={o.isCorrect} onChange={(e) => updateOption(i, { isCorrect: e.target.checked })} />
                  صحيح
                </label>
              )}
              {type !== "ordering" && !o.isCorrect && (
                <input
                  className="w-56 text-xs"
                  placeholder="سبب الخطأ (اختياري)"
                  value={o.wrongReason ?? ""}
                  onChange={(e) => updateOption(i, { wrongReason: e.target.value })}
                />
              )}
              <button type="button" onClick={() => removeOption(i)} className="text-xs text-red-500">حذف</button>
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={addOption} className="w-fit">+ إضافة خيار</Button>
        </div>
      )}

      {type === "numeric_input" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500">الإجابة الصحيحة</label>
            <input value={numericAnswer} onChange={(e) => setNumericAnswer(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500">هامش خطأ مقبول</label>
            <input type="number" step="0.01" value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-500">المهارات المرتبطة</label>
        <div className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <label
              key={s.id}
              className={`cursor-pointer rounded-md border px-3 py-1.5 text-xs font-semibold ${
                skillIds.includes(s.id) ? "border-teal-700 bg-teal-50 text-teal-900" : "border-slate-200 text-slate-600"
              }`}
            >
              <input type="checkbox" className="hidden" checked={skillIds.includes(s.id)} onChange={() => toggleSkill(s.id)} />
              {s.name}
            </label>
          ))}
          {skills.length === 0 && <p className="text-xs text-slate-400">لا توجد مهارات بعد — أنشئ مهارة أولًا من صفحة المهارات.</p>}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving || !lessonId}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>إلغاء</Button>
      </div>
    </form>
  );
}
