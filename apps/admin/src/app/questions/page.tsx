"use client";

import { useEffect, useState } from "react";
import type {
  AdminLesson,
  AdminSkill,
  AdminUnit,
  QuestionDetail,
  QuestionStatus,
  QuestionSummary,
  SaveQuestionInput,
} from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { QuestionForm } from "@/components/QuestionForm";
import { api } from "@/lib/api";

// دورة حياة المحتوى (docs/question-model.md):
// Draft → In Review → Changes Requested → Approved → Published → Archived
const LIFECYCLE = ["Draft", "In Review", "Changes Requested", "Approved", "Published", "Archived"];

const STATUS_LABELS: Record<QuestionStatus, string> = {
  draft: "مسودة",
  in_review: "قيد المراجعة",
  changes_requested: "طُلب تعديل",
  approved: "معتمد",
  published: "منشور",
  archived: "مؤرشف",
};
const STATUS_STYLES: Record<QuestionStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  in_review: "bg-amber-100 text-amber-900",
  changes_requested: "bg-orange-100 text-orange-900",
  approved: "bg-blue-100 text-blue-900",
  published: "bg-teal-100 text-teal-800",
  archived: "bg-slate-200 text-slate-500",
};

export default function QuestionsPage() {
  const [items, setItems] = useState<QuestionSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [units, setUnits] = useState<AdminUnit[]>([]);
  const [skills, setSkills] = useState<AdminSkill[]>([]);
  const [gradeId, setGradeId] = useState("");
  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<QuestionDetail | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function loadList() {
    api.adminListQuestions({ status: statusFilter, q: search }).then(setItems).catch(() => setItems([]));
  }

  useEffect(loadList, [statusFilter, search]);

  useEffect(() => {
    api.adminListLessons().then(setLessons);
    api.adminListSkills().then(setSkills);
    api.listGrades().then((gs) => {
      if (!gs[0]) return;
      setGradeId(gs[0].id);
      api.listSubjectsForGrade(gs[0].id).then((ss) => {
        if (ss[0]) api.adminListUnits(ss[0].id).then(setUnits);
      });
    });
  }, []);

  function unitAndSubjectFor(lessonId: string) {
    const lesson = lessons.find((l) => l.id === lessonId);
    const unit = units.find((u) => u.id === lesson?.unitId);
    return { unitId: unit?.id ?? "", subjectId: unit?.subjectId ?? "" };
  }

  async function handleCreate(input: SaveQuestionInput) {
    const { unitId, subjectId } = unitAndSubjectFor(input.lessonId!);
    await api.adminCreateQuestion({ ...input, gradeId, subjectId, unitId });
    setView("list");
    loadList();
  }

  async function handleUpdate(input: SaveQuestionInput) {
    if (!editing) return;
    await api.adminUpdateQuestion(editing.id, input);
    setView("list");
    setEditing(undefined);
    loadList();
  }

  async function openEdit(id: string) {
    setError(null);
    try {
      const detail = await api.adminGetQuestion(id);
      setEditing(detail);
      setView("form");
    } catch (err: any) {
      setError(err?.message ?? "تعذّر جلب السؤال");
    }
  }

  async function runAction(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    setError(null);
    try {
      await action();
      loadList();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر تنفيذ العملية");
    } finally {
      setBusyId(null);
    }
  }

  if (view === "form") {
    return (
      <div className="space-y-5">
        <header>
          <p className="admin-eyebrow">بنك الأسئلة</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">{editing ? "تعديل سؤال" : "سؤال جديد"}</h1>
          {editing && editing.status !== "draft" && (
            <p className="mt-2 text-sm text-amber-700">
              هذا السؤال {editing.status === "published" ? "منشور" : "قيد المراجعة أو معتمد"} — الحفظ سينشئ إصدارًا
              جديدًا ويعيده لحالة "مسودة" دون التأثير على نتائج الطلاب السابقة.
            </p>
          )}
        </header>
        <QuestionForm
          lessons={lessons}
          skills={skills}
          initial={editing}
          onSubmit={editing ? handleUpdate : handleCreate}
          onCancel={() => { setView("list"); setEditing(undefined); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="admin-eyebrow">بنك الأسئلة</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">دورة حياة السؤال</h1>
          <p className="mt-2 max-w-3xl leading-7 text-slate-600">
            لا يغيّر السؤال المنشور نتائج قديمة؛ أي تعديل تعليمي بعد النشر ينشئ إصدارًا جديدًا.
          </p>
        </div>
        <Button onClick={() => { setEditing(undefined); setView("form"); }}>+ سؤال جديد</Button>
      </header>

      <div className="flex flex-wrap gap-2 text-xs font-bold">
        {LIFECYCLE.map((s, i) => (
          <span key={s} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-700">
            {i + 1}. {s}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-w-[10rem]">
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_LABELS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
        <input placeholder="بحث في نص السؤال..." value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-[16rem]" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="admin-surface overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-bold">السؤال</th>
              <th className="px-4 py-3 font-bold">الدرس</th>
              <th className="px-4 py-3 font-bold">الحالة</th>
              <th className="px-4 py-3 font-bold">الاستخدام</th>
              <th className="px-4 py-3 font-bold">نسبة الخطأ</th>
              <th className="px-4 py-3 font-bold">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((q) => (
              <tr key={q.id}>
                <td className="max-w-xs truncate px-4 py-3 font-semibold text-slate-950">{q.body}</td>
                <td className="px-4 py-3 text-slate-600">{q.lessonName}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-1 text-xs font-bold ${STATUS_STYLES[q.status]}`}>
                    {STATUS_LABELS[q.status]}
                  </span>
                  {q.openReports > 0 && (
                    <span className="mr-2 rounded-md bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                      {q.openReports} بلاغ
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{q.usageCount}</td>
                <td className="px-4 py-3 text-slate-600">
                  {q.errorRate === null ? "—" : `${Math.round(q.errorRate * 100)}%`}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Button variant="secondary" onClick={() => openEdit(q.id)} disabled={busyId === q.id}>تعديل</Button>
                    {(q.status === "draft" || q.status === "changes_requested") && (
                      <Button onClick={() => runAction(q.id, () => api.adminSubmitForReview(q.id))} disabled={busyId === q.id}>
                        إرسال للمراجعة
                      </Button>
                    )}
                    {q.status === "approved" && (
                      <Button onClick={() => runAction(q.id, () => api.adminPublishQuestion(q.id))} disabled={busyId === q.id}>
                        نشر
                      </Button>
                    )}
                    {q.status !== "archived" && (
                      <Button variant="danger" onClick={() => runAction(q.id, () => api.adminArchiveQuestion(q.id))} disabled={busyId === q.id}>
                        أرشفة
                      </Button>
                    )}
                    {q.status === "draft" && (
                      <Button variant="danger" onClick={() => runAction(q.id, () => api.adminDeleteQuestion(q.id))} disabled={busyId === q.id}>
                        حذف
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p className="p-5 text-sm text-slate-500">لا توجد أسئلة مطابقة.</p>}
      </div>
    </div>
  );
}
