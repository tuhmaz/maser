"use client";

import { useEffect, useState } from "react";
import type { AdminLesson, AdminSkill } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";

// إدارة المهارات — docs/curriculum-structure.md. ربط المهارة بدرس اختياري عند الإنشاء
// (متطلبات سابقة بين المهارات skill_prerequisites تُبنى لاحقًا عند الحاجة الفعلية).
export default function SkillsPage() {
  const [skills, setSkills] = useState<AdminSkill[]>([]);
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [lessonId, setLessonId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminSkill | null>(null);

  function load() {
    api.adminListSkills().then(setSkills).catch(() => setSkills([]));
  }

  useEffect(() => {
    load();
    api.adminListLessons().then(setLessons).catch(() => setLessons([]));
  }, []);

  const lessonNameById = Object.fromEntries(lessons.map((l) => [l.id, l.name]));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.adminCreateSkill({ name, description, difficulty, lessonId: lessonId || undefined });
      setName("");
      setDescription("");
      load();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر إنشاء المهارة");
    }
  }

  async function handleSaveEdit() {
    if (!editing) return;
    setError(null);
    try {
      await api.adminUpdateSkill(editing.id, {
        name: editing.name, description: editing.description, difficulty: editing.difficulty,
      });
      setEditing(null);
      load();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر حفظ التعديل");
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="admin-eyebrow">المنهاج</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">المهارات</h1>
      </header>

      <form onSubmit={handleCreate} className="admin-surface flex flex-wrap items-end gap-3 p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">اسم المهارة</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="w-56" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">وصف قصير</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-64" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">الصعوبة</label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="easy">سهلة</option>
            <option value="medium">متوسطة</option>
            <option value="hard">صعبة</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">اربطها بدرس (اختياري)</label>
          <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} className="min-w-[10rem]">
            <option value="">—</option>
            {lessons.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <Button type="submit">إضافة مهارة</Button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="admin-surface overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-bold">الاسم</th>
              <th className="px-4 py-3 font-bold">الوصف</th>
              <th className="px-4 py-3 font-bold">الصعوبة</th>
              <th className="px-4 py-3 font-bold">الدروس المرتبطة</th>
              <th className="px-4 py-3 font-bold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {skills.map((s) => (
              <tr key={s.id}>
                {editing?.id === s.id ? (
                  <>
                    <td className="px-4 py-2"><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></td>
                    <td className="px-4 py-2"><input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></td>
                    <td className="px-4 py-2">
                      <select value={editing.difficulty} onChange={(e) => setEditing({ ...editing, difficulty: e.target.value as AdminSkill["difficulty"] })}>
                        <option value="easy">سهلة</option>
                        <option value="medium">متوسطة</option>
                        <option value="hard">صعبة</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-400">{s.lessonIds.length}</td>
                    <td className="flex gap-2 px-4 py-2">
                      <Button onClick={handleSaveEdit}>حفظ</Button>
                      <Button variant="secondary" onClick={() => setEditing(null)}>إلغاء</Button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-semibold text-slate-950">{s.name}</td>
                    <td className="px-4 py-3 text-slate-600">{s.description || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {{ easy: "سهلة", medium: "متوسطة", hard: "صعبة" }[s.difficulty]}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {s.lessonIds.map((id) => lessonNameById[id]).filter(Boolean).join("، ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="secondary" onClick={() => setEditing(s)}>تعديل</Button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {skills.length === 0 && <p className="p-5 text-sm text-slate-500">لا توجد مهارات بعد.</p>}
      </div>
    </div>
  );
}
