"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Save, Search, Sparkles, X } from "lucide-react";
import type { AdminLesson, AdminSkill } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "@/components/AdminPageHeader";

const DIFFICULTY_LABELS = { easy: "سهلة", medium: "متوسطة", hard: "صعبة" };

export default function SkillsPage() {
  const [skills, setSkills] = useState<AdminSkill[]>([]);
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<AdminSkill["difficulty"]>("medium");
  const [lessonId, setLessonId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminSkill | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    Promise.all([api.adminListSkills(), api.adminListLessons()])
      .then(([skillItems, lessonItems]) => {
        setSkills(skillItems);
        setLessons(lessonItems);
      })
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب المهارات"));
  }
  useEffect(load, []);

  const lessonNameById = useMemo(() => Object.fromEntries(lessons.map((lesson) => [lesson.id, lesson.name])), [lessons]);
  const visibleSkills = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return skills;
    return skills.filter((skill) => [skill.name, skill.description, ...skill.lessonIds.map((id) => lessonNameById[id])]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalized)));
  }, [lessonNameById, query, skills]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.adminCreateSkill({ name: name.trim(), description: description.trim() || undefined, difficulty, lessonId: lessonId || undefined });
      setName("");
      setDescription("");
      setLessonId("");
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر إنشاء المهارة");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      await api.adminUpdateSkill(editing.id, {
        name: editing.name.trim(),
        description: editing.description?.trim() ?? "",
        difficulty: editing.difficulty,
      });
      setEditing(null);
      load();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر حفظ المهارة");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="نموذج الإتقان"
        title="المهارات"
        description="المهارات هي وحدة القياس الأكاديمية. يمكن ربط المهارة بدرس عند إنشائها."
        actions={
          <>
            <Button variant="secondary" onClick={load}><RefreshCw size={17} /> تحديث</Button>
            <Button onClick={() => setShowForm((value) => !value)}><Plus size={17} /> مهارة جديدة</Button>
          </>
        }
      />

      {error && <p role="alert" className="admin-error">{error}</p>}

      {showForm && (
        <form onSubmit={create} className="admin-surface grid gap-4 p-5 xl:grid-cols-[minmax(180px,0.8fr)_minmax(240px,1.2fr)_150px_minmax(200px,0.8fr)_auto] xl:items-end">
          <Field label="اسم المهارة"><input className="w-full" value={name} onChange={(event) => setName(event.target.value)} required /></Field>
          <Field label="الوصف"><input className="w-full" value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
          <Field label="الصعوبة"><DifficultySelect value={difficulty} onChange={setDifficulty} /></Field>
          <Field label="الدرس المرتبط"><select className="w-full" value={lessonId} onChange={(event) => setLessonId(event.target.value)}><option value="">بدون ربط</option>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.name}</option>)}</select></Field>
          <Button type="submit" disabled={saving}>{saving ? "جارٍ الحفظ..." : "حفظ المهارة"}</Button>
        </form>
      )}

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8d99ad]" size={17} />
        <input className="w-full pr-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث في المهارات والدروس..." />
      </div>

      {visibleSkills.length === 0 ? (
        <AdminEmptyState title="لا توجد مهارات مطابقة" icon={<Sparkles size={30} />} />
      ) : (
        <section className="admin-surface overflow-hidden">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>المهارة</th><th>الوصف</th><th>الصعوبة</th><th>الدروس المرتبطة</th><th>الإجراءات</th></tr></thead>
              <tbody className="divide-y divide-[#edf1f6]">
                {visibleSkills.map((skill) => (
                  <tr key={skill.id}>
                    {editing?.id === skill.id ? (
                      <>
                        <td><input className="min-w-48" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></td>
                        <td><input className="min-w-64" value={editing.description ?? ""} onChange={(event) => setEditing({ ...editing, description: event.target.value })} /></td>
                        <td><DifficultySelect value={editing.difficulty} onChange={(value) => setEditing({ ...editing, difficulty: value })} /></td>
                        <td className="text-xs text-[#64718a]">{skill.lessonIds.length} روابط</td>
                        <td><div className="flex gap-2"><Button onClick={() => void saveEdit()} disabled={saving}><Save size={16} /> حفظ</Button><Button variant="secondary" onClick={() => setEditing(null)}><X size={16} /> إلغاء</Button></div></td>
                      </>
                    ) : (
                      <>
                        <td className="font-black text-[#12213f]">{skill.name}</td>
                        <td className="max-w-md text-sm leading-6 text-[#64718a]">{skill.description || "—"}</td>
                        <td><AdminStatusBadge label={DIFFICULTY_LABELS[skill.difficulty]} tone={skill.difficulty === "hard" ? "danger" : skill.difficulty === "medium" ? "warning" : "success"} /></td>
                        <td className="max-w-sm text-xs leading-6 text-[#526078]">{skill.lessonIds.map((id) => lessonNameById[id]).filter(Boolean).join("، ") || "غير مرتبطة"}</td>
                        <td><Button variant="secondary" onClick={() => setEditing({ ...skill })}><Pencil size={16} /> تعديل</Button></td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-black text-[#526078]">{label}</span>{children}</label>;
}

function DifficultySelect({
  value,
  onChange,
}: {
  value: AdminSkill["difficulty"];
  onChange: (value: AdminSkill["difficulty"]) => void;
}) {
  return (
    <select className="w-full" value={value} onChange={(event) => onChange(event.target.value as AdminSkill["difficulty"])}>
      <option value="easy">سهلة</option>
      <option value="medium">متوسطة</option>
      <option value="hard">صعبة</option>
    </select>
  );
}
