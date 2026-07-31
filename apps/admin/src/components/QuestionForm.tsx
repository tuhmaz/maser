"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Plus, Save, Trash2, X } from "lucide-react";
import type {
  AdminLesson,
  AdminQuestionOption,
  AdminSkill,
  QuestionDetail,
  QuestionMedia,
  QuestionType,
  SaveQuestionInput,
} from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";

const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: "اختيار من متعدد",
  true_false: "صح أو خطأ",
  multi_select: "اختيار متعدد (أكثر من إجابة)",
  numeric_input: "إدخال رقم",
  ordering: "ترتيب خطوات",
  matching: "مطابقة (غير مدعومة في الواجهة بعد)",
};

const SUPPORTED_TYPES: QuestionType[] = [
  "single_choice",
  "true_false",
  "multi_select",
  "numeric_input",
  "ordering",
];

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

  useEffect(() => {
    if (!lessonId && lessons[0]) setLessonId(lessons[0].id);
  }, [lessonId, lessons]);

  const needsOptions = ["single_choice", "true_false", "multi_select", "ordering"].includes(type);

  function updateOption(index: number, patch: Partial<AdminQuestionOption>) {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }
  function addOption() {
    setOptions((prev) => [...prev, { text: "", order: prev.length + 1, isCorrect: false }]);
  }
  function removeOption(index: number) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index).map((o, i) => ({ ...o, order: i + 1 })));
  }
  function toggleSkill(id: string) {
    setSkillIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function changeType(nextType: QuestionType) {
    setType(nextType);
    if (nextType === "true_false") {
      setOptions([
        { text: "صح", order: 1, isCorrect: true },
        { text: "خطأ", order: 2, isCorrect: false },
      ]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (skillIds.length === 0) {
      setError("اربط السؤال بمهارة واحدة على الأقل");
      return;
    }
    if (!lessonId) {
      setError("اختر الدرس المرتبط بالسؤال");
      return;
    }
    if (!body.trim()) {
      setError("نص السؤال مطلوب");
      return;
    }
    if (needsOptions) {
      const filledOptions = options.filter((option) => option.text.trim());
      if (filledOptions.length < 2 || filledOptions.length !== options.length) {
        setError("أدخل خيارين مكتملين على الأقل");
        return;
      }
      const correctCount = options.filter((option) => option.isCorrect).length;
      if (["single_choice", "true_false"].includes(type) && correctCount !== 1) {
        setError("حدد إجابة صحيحة واحدة فقط");
        return;
      }
      if (type === "multi_select" && correctCount < 1) {
        setError("حدد إجابة صحيحة واحدة على الأقل");
        return;
      }
    }
    if (type === "numeric_input" && !numericAnswer.trim()) {
      setError("أدخل الإجابة الرقمية الصحيحة");
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
    <form onSubmit={handleSubmit} className="admin-surface overflow-hidden">
      <section className="border-b border-[#e7ecf3] p-5">
        <h2 className="font-black text-[#12213f]">تصنيف السؤال</h2>
        <p className="mt-1 text-xs text-[#64718a]">حدد موقع السؤال ونوعه ومستوى صعوبته.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-black text-[#526078]">الدرس</label>
          <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} required className="w-full">
            {lessons.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-black text-[#526078]">نوع السؤال</label>
          <select value={type} onChange={(e) => changeType(e.target.value as QuestionType)} className="w-full">
            {SUPPORTED_TYPES.map((value) => <option key={value} value={value}>{TYPE_LABELS[value]}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-black text-[#526078]">الصعوبة</label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)} className="w-full">
            <option value="easy">سهلة</option>
            <option value="medium">متوسطة</option>
            <option value="hard">صعبة</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-black text-[#526078]">الزمن المتوقع (ثانية)</label>
          <input type="number" min={10} max={1800} value={expectedTimeSec} onChange={(e) => setExpectedTimeSec(Number(e.target.value))} className="w-full" />
        </div>
      </div>
      </section>

      <section className="border-b border-[#e7ecf3] p-5">
        <h2 className="font-black text-[#12213f]">محتوى السؤال</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-[#526078]">نص السؤال</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={5} className="w-full resize-y" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-[#526078]">تفسير الحل</label>
            <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={5} className="w-full resize-y" placeholder="اشرح لماذا الإجابة صحيحة وكيف يصل إليها الطالب" />
          </div>
        </div>
      </section>

      {initial && <section className="border-b border-[#e7ecf3] p-5"><MediaUploader questionId={initial.id} /></section>}

      {needsOptions && (
        <section className="border-b border-[#e7ecf3] p-5">
          <label className="text-sm font-black text-[#12213f]">
            الخيارات {type === "ordering" && "(الترتيب هنا هو الترتيب الصحيح)"}
          </label>
          <p className="mt-1 text-xs text-[#64718a]">حدد الإجابة الصحيحة وأضف سبب الخطأ للخيارات المضللة عند الحاجة.</p>
          <div className="mt-4 space-y-3">
          {options.map((o, i) => (
            <div key={i} className="grid items-center gap-2 rounded-lg border border-[#e7ecf3] bg-[#fbfcfe] p-3 lg:grid-cols-[32px_minmax(180px,1fr)_auto_minmax(180px,0.7fr)_36px]">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eaf2ff] text-xs font-black text-[#1565d8]">{i + 1}</span>
              <input
                className="w-full"
                placeholder="نص الخيار"
                value={o.text}
                onChange={(e) => updateOption(i, { text: e.target.value })}
                required
              />
              {type !== "ordering" && (
                <label className="flex items-center gap-2 whitespace-nowrap text-xs font-bold text-[#526078]">
                  <input type="checkbox" checked={o.isCorrect} onChange={(e) => updateOption(i, { isCorrect: e.target.checked })} />
                  صحيح
                </label>
              )}
              {type !== "ordering" && !o.isCorrect && (
                <input
                  className="w-full text-xs"
                  placeholder="سبب الخطأ (اختياري)"
                  value={o.wrongReason ?? ""}
                  onChange={(e) => updateOption(i, { wrongReason: e.target.value })}
                />
              )}
              <button type="button" onClick={() => removeOption(i)} disabled={options.length <= 2} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#d64f5b] disabled:opacity-30" aria-label={`حذف الخيار ${i + 1}`}><Trash2 size={16} /></button>
            </div>
          ))}
          </div>
          <Button type="button" variant="secondary" onClick={addOption} className="mt-3 w-fit"><Plus size={16} /> إضافة خيار</Button>
        </section>
      )}

      {type === "numeric_input" && (
        <section className="grid gap-4 border-b border-[#e7ecf3] p-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-[#526078]">الإجابة الصحيحة</label>
            <input value={numericAnswer} onChange={(e) => setNumericAnswer(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-[#526078]">هامش خطأ مقبول</label>
            <input type="number" step="0.01" value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} />
          </div>
        </section>
      )}

      <section className="p-5">
        <label className="text-sm font-black text-[#12213f]">المهارات المرتبطة</label>
        <p className="mt-1 text-xs text-[#64718a]">يلزم ربط السؤال بمهارة واحدة على الأقل حتى يدخل نموذج الإتقان.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {skills.map((s) => (
            <label
              key={s.id}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-bold ${
                skillIds.includes(s.id) ? "border-[#1565d8] bg-[#eaf2ff] text-[#1565d8]" : "border-[#dfe6f1] bg-white text-[#64718a]"
              }`}
            >
              <input type="checkbox" className="hidden" checked={skillIds.includes(s.id)} onChange={() => toggleSkill(s.id)} />
              {s.name}
            </label>
          ))}
          {skills.length === 0 && <p className="text-xs text-[#9aa6b8]">لا توجد مهارات بعد — أنشئ مهارة أولاً من صفحة المهارات.</p>}
        </div>
      </section>

      {error && <p className="admin-error mx-5">{error}</p>}

      <div className="flex gap-3 border-t border-[#e7ecf3] bg-[#f8faff] p-5">
        <Button type="submit" disabled={saving || !lessonId}><Save size={17} />{saving ? "جارٍ الحفظ..." : "حفظ المسودة"}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}><X size={17} /> إلغاء</Button>
      </div>
    </form>
  );
}

// رفع صورة للسؤال — docs/database-design.md: Object Storage، لا تُخزَّن الملفات
// داخل قاعدة البيانات. سياسة صارمة على الخادم: صور فقط، حد 5 ميغابايت.
function MediaUploader({ questionId }: { questionId: string }) {
  const [items, setItems] = useState<QuestionMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.adminListQuestionMedia(questionId).then(setItems).catch(() => setItems([]));
  }
  useEffect(load, [questionId]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await api.adminUploadQuestionMedia(questionId, file);
      load();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-black text-[#12213f]">صور السؤال</label>
      <p className="text-xs text-[#64718a]">صور PNG أو JPEG أو WebP أو GIF بحد أقصى 5 ميغابايت.</p>
      <div className="flex flex-wrap gap-3">
        {items.map((m) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={m.id} src={m.url} alt="" className="h-20 w-20 rounded-lg border border-[#dfe6f1] object-cover" />
        ))}
        <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#c7d2e1] text-xs font-bold text-[#64718a] hover:border-[#1565d8] hover:text-[#1565d8]">
          <ImagePlus size={20} />
          {uploading ? "جارٍ الرفع" : "رفع صورة"}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
      </div>
      {error && <p className="text-xs font-bold text-[#d64f5b]">{error}</p>}
    </div>
  );
}
