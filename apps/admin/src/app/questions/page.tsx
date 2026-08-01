"use client";

import { useDeferredValue, useEffect, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Database,
  FileEdit,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import type {
  AdminLesson,
  AdminSkill,
  AdminUnit,
  QuestionDetail,
  QuestionStatus,
  QuestionSummary,
  ReportsOverview,
  SaveQuestionInput,
} from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { QuestionForm } from "@/components/QuestionForm";
import { AIDraftModal } from "@/components/AIDraftModal";
import { api } from "@/lib/api";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "@/components/AdminPageHeader";

// من يملك صلاحية ai_content.generate فعليًا (migration 0016) — content_reviewer/
// support يراجعان المحتوى ولا يولّدانه، فلا يُعرض لهما الزر إطلاقًا.
const AI_GENERATE_ROLES = ["super_admin", "admin", "content_editor"];

const LIFECYCLE: Array<{ key: QuestionStatus; label: string }> = [
  { key: "draft", label: "مسودة" },
  { key: "in_review", label: "قيد المراجعة" },
  { key: "changes_requested", label: "طلب تعديل" },
  { key: "approved", label: "معتمد" },
  { key: "published", label: "منشور" },
  { key: "archived", label: "مؤرشف" },
];

const STATUS_LABELS: Record<QuestionStatus, string> = Object.fromEntries(
  LIFECYCLE.map((item) => [item.key, item.label]),
) as Record<QuestionStatus, string>;

const STATUS_TONES: Record<QuestionStatus, "success" | "warning" | "danger" | "info" | "neutral"> = {
  draft: "neutral",
  in_review: "warning",
  changes_requested: "danger",
  approved: "info",
  published: "success",
  archived: "neutral",
};

const DIFFICULTY_LABELS = { easy: "سهل", medium: "متوسط", hard: "صعب" };

export default function QuestionsPage() {
  const [items, setItems] = useState<QuestionSummary[]>([]);
  const [overview, setOverview] = useState<ReportsOverview | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [units, setUnits] = useState<AdminUnit[]>([]);
  const [skills, setSkills] = useState<AdminSkill[]>([]);
  const [gradeIdBySubject, setGradeIdBySubject] = useState<Record<string, string>>({});
  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<QuestionDetail | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [role, setRole] = useState<string | undefined>(undefined);
  const [showAIModal, setShowAIModal] = useState(false);

  useEffect(() => {
    api.me().then((u) => setRole(u.role)).catch(() => {});
  }, []);

  function loadList() {
    setLoading(true);
    setError(null);
    Promise.all([
      api.adminListQuestions({ status: statusFilter, q: deferredSearch }),
      api.adminReportsOverview(),
    ])
      .then(([questionItems, report]) => {
        setItems(questionItems);
        setOverview(report);
      })
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب بنك الأسئلة"))
      .finally(() => setLoading(false));
  }

  useEffect(loadList, [statusFilter, deferredSearch]);

  useEffect(() => {
    async function loadReferences() {
      try {
        const [lessonItems, skillItems, gradeItems] = await Promise.all([
          api.adminListLessons(),
          api.adminListSkills(),
          api.listGrades(),
        ]);
        const allUnits: AdminUnit[] = [];
        const gradeMap: Record<string, string> = {};
        for (const grade of gradeItems) {
          const subjects = await api.listSubjectsForGrade(grade.id);
          for (const subject of subjects) {
            gradeMap[subject.id] = grade.id;
            allUnits.push(...await api.adminListUnits(subject.id));
          }
        }
        setLessons(lessonItems);
        setSkills(skillItems);
        setUnits(allUnits);
        setGradeIdBySubject(gradeMap);
      } catch (err: any) {
        setError(err?.message ?? "تعذّر جلب مراجع المنهاج");
      }
    }
    void loadReferences();
  }, []);

  function hierarchyForLesson(lessonId: string) {
    const lesson = lessons.find((item) => item.id === lessonId);
    const unit = units.find((item) => item.id === lesson?.unitId);
    const subjectId = unit?.subjectId ?? "";
    return { unitId: unit?.id ?? "", subjectId, gradeId: gradeIdBySubject[subjectId] ?? "" };
  }

  async function handleCreate(input: SaveQuestionInput) {
    const hierarchy = hierarchyForLesson(input.lessonId!);
    if (!hierarchy.gradeId || !hierarchy.subjectId || !hierarchy.unitId) {
      throw new Error("تعذّر تحديد الصف والمادة والوحدة من الدرس المحدد");
    }
    await api.adminCreateQuestion({ ...input, ...hierarchy });
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
    setBusyId(id);
    setError(null);
    try {
      setEditing(await api.adminGetQuestion(id));
      setView("form");
    } catch (err: any) {
      setError(err?.message ?? "تعذّر جلب السؤال");
    } finally {
      setBusyId(null);
    }
  }

  async function runAction(
    id: string,
    action: () => Promise<unknown>,
    confirmation?: string,
  ) {
    if (confirmation && !window.confirm(confirmation)) return;
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
        <AdminPageHeader
          eyebrow="بنك الأسئلة"
          title={editing ? "تعديل السؤال" : "إنشاء سؤال"}
          description={editing && editing.status !== "draft"
            ? "حفظ التعديل ينشئ إصداراً جديداً ويعيد السؤال إلى المسودة دون تغيير نتائج الطلاب السابقة."
            : "أدخل السؤال والحل والتفسير والمهارات المرتبطة ثم احفظه كمسودة."}
        />
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

  const totalQuestions = Object.values(overview?.questionsByStatus ?? {}).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="إدارة المحتوى"
        title="بنك الأسئلة"
        description="دورة كاملة من المسودة إلى المراجعة والاعتماد والنشر مع حفظ إصدارات المحتوى."
        actions={
          <>
            <Button variant="secondary" onClick={loadList} disabled={loading}><RefreshCw size={17} className={loading ? "animate-spin" : ""} /> تحديث</Button>
            {role && AI_GENERATE_ROLES.includes(role) && (
              <Button variant="secondary" onClick={() => setShowAIModal(true)}><Sparkles size={17} /> توليد بالذكاء الاصطناعي</Button>
            )}
            <Button onClick={() => { setEditing(undefined); setView("form"); }}><Plus size={17} /> سؤال جديد</Button>
          </>
        }
      />

      {error && <p role="alert" className="admin-error">{error}</p>}

      <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {LIFECYCLE.map((status, index) => (
          <button
            key={status.key}
            type="button"
            onClick={() => setStatusFilter(statusFilter === status.key ? "" : status.key)}
            className={`admin-stat text-right transition ${statusFilter === status.key ? "border-[#1565d8] ring-2 ring-[#1565d8]/10" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#9aa6b8]">0{index + 1}</span>
              <AdminStatusBadge label={status.label} tone={STATUS_TONES[status.key]} />
            </div>
            <p className="mt-3 text-2xl font-black text-[#12213f]">
              {(overview?.questionsByStatus[status.key] ?? 0).toLocaleString("ar")}
            </p>
          </button>
        ))}
      </section>

      <section className="admin-surface flex flex-col gap-3 p-4 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8d99ad]" size={17} />
          <input className="w-full pr-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث في نص السؤال..." />
        </div>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-w-48">
          <option value="">كل الحالات ({totalQuestions})</option>
          {LIFECYCLE.map((status) => <option key={status.key} value={status.key}>{status.label}</option>)}
        </select>
      </section>

      <section className="admin-surface overflow-hidden">
        <div className="admin-table-wrap">
          <table className="admin-table min-w-[1050px]">
            <thead>
              <tr><th>السؤال</th><th>الدرس</th><th>الصعوبة</th><th>الحالة</th><th>الاستخدام</th><th>نسبة الخطأ</th><th>البلاغات</th><th>الإجراءات</th></tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f6]">
              {items.map((question) => (
                <tr key={question.id}>
                  <td className="max-w-80">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-black text-[#12213f]" title={question.body}>{question.body}</p>
                      {question.generatedByAi && <AdminStatusBadge label="AI" tone="info" />}
                    </div>
                    <p className="mt-1 text-[10px] text-[#9aa6b8]">{question.type}</p>
                  </td>
                  <td className="max-w-44 truncate text-[#526078]">{question.lessonName || "غير مرتبط"}</td>
                  <td><AdminStatusBadge label={DIFFICULTY_LABELS[question.difficulty]} tone={question.difficulty === "hard" ? "danger" : question.difficulty === "medium" ? "warning" : "success"} /></td>
                  <td><AdminStatusBadge label={STATUS_LABELS[question.status]} tone={STATUS_TONES[question.status]} /></td>
                  <td className="font-bold text-[#526078]">{question.usageCount.toLocaleString("ar")}</td>
                  <td className={question.errorRate !== null && question.errorRate >= 0.7 ? "font-black text-[#d64f5b]" : "text-[#526078]"}>
                    {question.errorRate === null ? "غير متاحة" : `${Math.round(question.errorRate * 100)}%`}
                  </td>
                  <td>
                    {question.openReports > 0
                      ? <AdminStatusBadge label={`${question.openReports} بلاغ`} tone="danger" />
                      : <span className="text-[#9aa6b8]">0</span>}
                  </td>
                  <td>
                    <div className="flex min-w-max gap-1.5">
                      <IconButton label="تعديل" onClick={() => void openEdit(question.id)} disabled={busyId === question.id}><FileEdit size={16} /></IconButton>
                      {(question.status === "draft" || question.status === "changes_requested") && (
                        <IconButton label="إرسال للمراجعة" onClick={() => void runAction(question.id, () => api.adminSubmitForReview(question.id))} disabled={busyId === question.id}><Send size={16} /></IconButton>
                      )}
                      {question.status === "approved" && (
                        <IconButton label="نشر" tone="success" onClick={() => void runAction(question.id, () => api.adminPublishQuestion(question.id), "نشر هذا السؤال سيجعله متاحاً في اختبارات الطلاب. هل تريد المتابعة؟")} disabled={busyId === question.id}><CheckCircle2 size={16} /></IconButton>
                      )}
                      {question.status !== "archived" && (
                        <IconButton label="أرشفة" tone="warning" onClick={() => void runAction(question.id, () => api.adminArchiveQuestion(question.id), "سيتم إيقاف استخدام هذا السؤال في المحاولات الجديدة. هل تريد أرشفته؟")} disabled={busyId === question.id}><Archive size={16} /></IconButton>
                      )}
                      {question.status === "draft" && (
                        <IconButton label="حذف المسودة" tone="danger" onClick={() => void runAction(question.id, () => api.adminDeleteQuestion(question.id), "حذف المسودة نهائي ولا يمكن التراجع عنه. هل تريد المتابعة؟")} disabled={busyId === question.id}><Trash2 size={16} /></IconButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && items.length === 0 && <div className="p-5"><AdminEmptyState title="لا توجد أسئلة مطابقة" description="غيّر الفلاتر أو أنشئ سؤالاً جديداً." icon={<Database size={30} />} /></div>}
      </section>

      {showAIModal && (
        <AIDraftModal
          lessons={lessons}
          skills={skills}
          hierarchyForLesson={hierarchyForLesson}
          onGenerated={(id) => { setShowAIModal(false); void openEdit(id); }}
          onClose={() => setShowAIModal(false)}
        />
      )}
    </div>
  );
}

function IconButton({
  label,
  children,
  onClick,
  disabled,
  tone = "default",
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const styles = {
    default: "border-[#dfe6f1] text-[#526078] hover:border-[#9eb7dc] hover:text-[#1565d8]",
    success: "border-[#bde5d8] text-[#159b72] hover:bg-[#e8f7f2]",
    warning: "border-[#f1d8af] text-[#b86f08] hover:bg-[#fff4e5]",
    danger: "border-[#efc6ca] text-[#d64f5b] hover:bg-[#ffeded]",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border bg-white transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[tone]}`}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}
