"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  AdminLesson,
  AdminQuiz,
  AdminSkill,
  AuditLogEntry,
  QuestionStatus,
  QuestionSummary,
  ReportsOverview,
} from "@alemedu/api-client";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Download,
  FileQuestion,
  GraduationCap,
  RefreshCw,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";

type DashboardData = {
  overview: ReportsOverview | null;
  questions: QuestionSummary[];
  reviews: QuestionSummary[];
  auditLogs: AuditLogEntry[];
  lessons: AdminLesson[];
  skills: AdminSkill[];
  quizzes: AdminQuiz[];
};

const EMPTY_DATA: DashboardData = {
  overview: null,
  questions: [],
  reviews: [],
  auditLogs: [],
  lessons: [],
  skills: [],
  quizzes: [],
};

const STATUS_META: Array<{ key: QuestionStatus; label: string; color: string }> = [
  { key: "draft", label: "مسودة", color: "#7b879c" },
  { key: "in_review", label: "قيد المراجعة", color: "#d98b17" },
  { key: "changes_requested", label: "تحتاج تعديلاً", color: "#d9604d" },
  { key: "approved", label: "معتمدة", color: "#7357d4" },
  { key: "published", label: "منشورة", color: "#159b72" },
  { key: "archived", label: "مؤرشفة", color: "#9aa5b6" },
];

const ACTION_LABELS: Record<string, string> = {
  "question.create": "أُضيف سؤال جديد",
  "question.update": "عُدّل سؤال",
  "question.submit_review": "أُرسل سؤال للمراجعة",
  "question.review": "اكتملت مراجعة سؤال",
  "question.publish": "نُشر سؤال",
  "question.archive": "أُرشف سؤال",
  "question.delete": "حُذفت مسودة سؤال",
  "question.upload_media": "أُضيف ملف إلى سؤال",
  "unit.create": "أُضيفت وحدة",
  "unit.update": "عُدّلت وحدة",
  "lesson.create": "أُضيف درس",
  "lesson.update": "عُدّل درس",
  "skill.create": "أُضيفت مهارة",
  "skill.update": "عُدّلت مهارة",
  "content_issue.resolve": "عولج بلاغ محتوى",
  "user.change_role": "تغيّرت صلاحية مستخدم",
  "feature_flag.update": "تغيّر إعداد ميزة",
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setFailedSources([]);

    const requests = await Promise.allSettled([
      api.adminReportsOverview(),
      api.adminListQuestions(),
      api.adminListReviews(),
      api.adminListAuditLogs(),
      api.adminListLessons(),
      api.adminListSkills(),
      api.adminListQuizzes(),
    ]);

    const labels = ["التقارير", "الأسئلة", "المراجعات", "سجل النشاط", "الدروس", "المهارات", "الاختبارات"];
    setFailedSources(
      requests.flatMap((request, index) => (request.status === "rejected" ? [labels[index]] : [])),
    );
    setData({
      overview: valueOr(requests[0], null),
      questions: valueOr(requests[1], []),
      reviews: valueOr(requests[2], []),
      auditLogs: valueOr(requests[3], []),
      lessons: valueOr(requests[4], []),
      skills: valueOr(requests[5], []),
      quizzes: valueOr(requests[6], []),
    });
    setRefreshedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const publishedCount = data.overview?.questionsByStatus.published ?? 0;
  const totalQuestions = useMemo(
    () => Object.values(data.overview?.questionsByStatus ?? {}).reduce((sum, count) => sum + count, 0),
    [data.overview],
  );
  const publicationRate = totalQuestions > 0 ? Math.round((publishedCount / totalQuestions) * 100) : 0;
  const maxStatusCount = Math.max(
    1,
    ...STATUS_META.map((status) => data.overview?.questionsByStatus[status.key] ?? 0),
  );

  function exportCsv() {
    if (!data.overview) return;
    const rows = [
      ["المؤشر", "القيمة"],
      ["إجمالي الطلاب", data.overview.totalStudents],
      ["متوسط نتيجة الاختبارات", data.overview.averageScore ?? "غير متاح"],
      ["بلاغات المحتوى المفتوحة", data.overview.openContentReports],
      ["أسئلة عالية الخطأ", data.overview.highErrorQuestions],
      ["محاولات غير مكتملة", data.overview.staleIncompleteAttempts],
      ...STATUS_META.map((status) => [`الأسئلة - ${status.label}`, data.overview?.questionsByStatus[status.key] ?? 0]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `alemedu-admin-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <header className="admin-page-header">
        <div>
          <p className="admin-eyebrow">نظرة تشغيلية مباشرة</p>
          <h1 className="admin-page-title">لوحة الإدارة</h1>
          <p className="admin-page-copy">إدارة المحتوى وجودته ومتابعة تعلم الطلاب من بيانات النظام الحالية.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void loadDashboard()} disabled={loading}>
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} aria-hidden="true" />
            تحديث
          </Button>
          <Button variant="secondary" onClick={exportCsv} disabled={!data.overview}>
            <Download size={17} aria-hidden="true" />
            تصدير CSV
          </Button>
        </div>
      </header>

      {failedSources.length > 0 && (
        <div className="admin-error flex items-start gap-2">
          <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
          <span>تعذّر تحميل: {failedSources.join("، ")}. بقية المؤشرات المعروضة مصدرها البيانات التي استجابت بنجاح.</span>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {loading && !data.overview
          ? Array.from({ length: 6 }).map((_, index) => <div key={index} className="admin-loading h-32" />)
          : [
              {
                icon: Users,
                label: "إجمالي الطلاب",
                value: numberValue(data.overview?.totalStudents),
                helper: "حساب طالب غير محذوف",
                color: "bg-[#eaf2ff] text-[#1565d8]",
              },
              {
                icon: Database,
                label: "الأسئلة المنشورة",
                value: numberValue(publishedCount),
                helper: `${publicationRate}% من بنك الأسئلة`,
                color: "bg-[#e8f7f2] text-[#159b72]",
              },
              {
                icon: ClipboardCheck,
                label: "بانتظار المراجعة",
                value: numberValue(data.overview?.questionsByStatus.in_review),
                helper: "بحاجة إلى قرار مراجع",
                color: "bg-[#fff4e5] text-[#d98b17]",
              },
              {
                icon: AlertTriangle,
                label: "بلاغات مفتوحة",
                value: numberValue(data.overview?.openContentReports),
                helper: "تحتاج معالجة المحتوى",
                color: "bg-[#ffeded] text-[#d64f5b]",
              },
              {
                icon: BarChart3,
                label: "متوسط النتائج",
                value: data.overview?.averageScore == null ? "غير متاح" : `${Math.round(data.overview.averageScore)}%`,
                helper: "من نتائج المحاولات المسلّمة",
                color: "bg-[#f0edff] text-[#7357d4]",
              },
              {
                icon: FileQuestion,
                label: "أسئلة عالية الخطأ",
                value: numberValue(data.overview?.highErrorQuestions),
                helper: "خطأ 70% بعد 5 إجابات",
                color: "bg-[#e7f7fb] text-[#087d96]",
              },
            ].map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
        <article className="admin-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-[#12213f]">توزيع دورة المحتوى</h2>
              <p className="mt-1 text-xs text-[#64718a]">عدد الأسئلة الفعلي في كل حالة نشر.</p>
            </div>
            <span className="admin-chip bg-[#eef4fd] text-[#1565d8]">{totalQuestions.toLocaleString("ar")} سؤال</span>
          </div>

          <div className="mt-6 space-y-4">
            {STATUS_META.map((status) => {
              const count = data.overview?.questionsByStatus[status.key] ?? 0;
              return (
                <div key={status.key}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-bold text-[#526078]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                      {status.label}
                    </span>
                    <span className="font-black text-[#12213f]">{count.toLocaleString("ar")}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#edf1f6]">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${(count / maxStatusCount) * 100}%`, backgroundColor: status.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="admin-surface overflow-hidden">
          <div className="flex items-start justify-between gap-4 border-b border-[#e7ecf3] p-5">
            <div>
              <h2 className="text-base font-black text-[#12213f]">المحتوى بانتظار المراجعة</h2>
              <p className="mt-1 text-xs text-[#64718a]">أولوية العمل الحالية لفريق المراجعة.</p>
            </div>
            <Link href="/reviews" className="flex items-center gap-1 text-xs font-black text-[#1565d8]">
              عرض الكل
              <ArrowLeft size={14} aria-hidden="true" />
            </Link>
          </div>
          {data.reviews.length === 0 ? (
            <div className="p-6 text-center text-sm text-[#64718a]">لا توجد أسئلة في طابور المراجعة.</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table min-w-[640px]">
                <thead>
                  <tr>
                    <th>السؤال</th>
                    <th>الدرس</th>
                    <th>الصعوبة</th>
                    <th>الاستخدام</th>
                    <th>البلاغات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1f6]">
                  {data.reviews.slice(0, 6).map((question) => (
                    <tr key={question.id}>
                      <td className="max-w-64 truncate font-bold text-[#12213f]">{question.body}</td>
                      <td className="whitespace-nowrap text-[#526078]">{question.lessonName || "غير مرتبط"}</td>
                      <td><DifficultyBadge difficulty={question.difficulty} /></td>
                      <td className="font-bold text-[#526078]">{question.usageCount.toLocaleString("ar")}</td>
                      <td>
                        <span className={question.openReports > 0 ? "font-black text-[#d64f5b]" : "text-[#64718a]"}>
                          {question.openReports.toLocaleString("ar")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.05fr)_minmax(280px,0.7fr)]">
        <article className="admin-surface overflow-hidden">
          <PanelHeader title="أحدث الأنشطة" href="/audit-logs" />
          {data.auditLogs.length === 0 ? (
            <p className="p-5 text-sm text-[#64718a]">لا توجد عمليات مسجلة بعد.</p>
          ) : (
            <div className="admin-divider-list">
              {data.auditLogs.slice(0, 6).map((log) => (
                <div key={log.id} className="flex gap-3 px-5 py-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eef4fd] text-[#1565d8]">
                    <Activity size={17} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#12213f]">{ACTION_LABELS[log.action] ?? log.action}</p>
                    <p className="mt-1 truncate text-[11px] text-[#64718a]">
                      {log.actorEmail || "عملية نظام"} · {formatRelativeTime(log.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="admin-surface overflow-hidden">
          <PanelHeader title="جاهزية المحتوى" href="/curriculum" />
          <div className="admin-table-wrap">
            <table className="admin-table min-w-[520px]">
              <thead>
                <tr>
                  <th>المكوّن</th>
                  <th>الإجمالي</th>
                  <th>المتاح</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1f6]">
                {[
                  {
                    icon: Database,
                    name: "بنك الأسئلة",
                    total: totalQuestions,
                    available: publishedCount,
                    ratio: publicationRate,
                  },
                  {
                    icon: BookOpen,
                    name: "الدروس",
                    total: data.lessons.length,
                    available: data.lessons.filter((lesson) => lesson.isActive).length,
                    ratio: ratio(data.lessons.filter((lesson) => lesson.isActive).length, data.lessons.length),
                  },
                  {
                    icon: Sparkles,
                    name: "المهارات",
                    total: data.skills.length,
                    available: data.skills.length,
                    ratio: data.skills.length > 0 ? 100 : 0,
                  },
                  {
                    icon: FileQuestion,
                    name: "الاختبارات",
                    total: data.quizzes.length,
                    available: data.quizzes.filter((quiz) => quiz.questionCount > 0).length,
                    ratio: ratio(data.quizzes.filter((quiz) => quiz.questionCount > 0).length, data.quizzes.length),
                  },
                ].map((row) => {
                  const Icon = row.icon;
                  return (
                    <tr key={row.name}>
                      <td>
                        <span className="flex items-center gap-2 font-bold text-[#12213f]">
                          <Icon size={17} className="text-[#1565d8]" aria-hidden="true" />
                          {row.name}
                        </span>
                      </td>
                      <td className="font-black text-[#12213f]">{row.total.toLocaleString("ar")}</td>
                      <td className="text-[#526078]">{row.available.toLocaleString("ar")}</td>
                      <td className="w-36">
                        <div className="flex items-center gap-2">
                          <div className="admin-progress flex-1"><span style={{ width: `${row.ratio}%` }} /></div>
                          <span className="w-8 text-left text-[11px] font-bold text-[#64718a]">{row.ratio}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-surface overflow-hidden">
          <div className="border-b border-[#e7ecf3] p-5">
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${failedSources.length === 0 ? "bg-[#e8f7f2] text-[#159b72]" : "bg-[#fff4e5] text-[#d98b17]"}`}>
                {failedSources.length === 0 ? <CheckCircle2 size={21} aria-hidden="true" /> : <AlertTriangle size={21} aria-hidden="true" />}
              </span>
              <div>
                <h2 className="text-base font-black text-[#12213f]">حالة مصادر البيانات</h2>
                <p className={`mt-1 text-xs font-bold ${failedSources.length === 0 ? "text-[#159b72]" : "text-[#d98b17]"}`}>
                  {loading ? "جاري التحقق..." : failedSources.length === 0 ? "جميع المصادر استجابت" : `${failedSources.length} مصادر لم تستجب`}
                </p>
              </div>
            </div>
          </div>
          <div className="admin-divider-list px-5">
            {[
              ["تقارير التشغيل", Boolean(data.overview)],
              ["بنك الأسئلة", !failedSources.includes("الأسئلة")],
              ["سجل التدقيق", !failedSources.includes("سجل النشاط")],
              ["بيانات المنهاج", !failedSources.some((source) => ["الدروس", "المهارات", "الاختبارات"].includes(source))],
            ].map(([label, healthy]) => (
              <div key={label as string} className="flex items-center justify-between py-3 text-sm">
                <span className="font-bold text-[#526078]">{label as string}</span>
                <span className={`admin-chip ${healthy ? "bg-[#e8f7f2] text-[#159b72]" : "bg-[#ffeded] text-[#d64f5b]"}`}>
                  <span className={`h-2 w-2 rounded-full ${healthy ? "bg-[#159b72]" : "bg-[#d64f5b]"}`} />
                  {healthy ? "متصل" : "متعذر"}
                </span>
              </div>
            ))}
          </div>
          <div className="bg-[#f8faff] px-5 py-3 text-[11px] text-[#64718a]">
            آخر تحديث: {refreshedAt ? refreshedAt.toLocaleTimeString("ar-JO", { hour: "2-digit", minute: "2-digit" }) : "—"}
          </div>
        </article>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  color,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
  color: string;
}) {
  return (
    <article className="admin-stat">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#64718a]">{label}</p>
          <p className={`mt-2 font-black text-[#12213f] ${value === "غير متاح" ? "text-lg" : "text-2xl"}`}>{value}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
          <Icon size={20} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-[11px] leading-5 text-[#7b879c]">{helper}</p>
    </article>
  );
}

function PanelHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#e7ecf3] p-5">
      <h2 className="text-base font-black text-[#12213f]">{title}</h2>
      <Link href={href} className="flex items-center gap-1 text-xs font-black text-[#1565d8]">
        عرض الكل
        <ArrowLeft size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: "easy" | "medium" | "hard" }) {
  const styles = {
    easy: "bg-[#e8f7f2] text-[#159b72]",
    medium: "bg-[#fff4e5] text-[#b86f08]",
    hard: "bg-[#ffeded] text-[#d64f5b]",
  };
  const labels = { easy: "سهل", medium: "متوسط", hard: "صعب" };
  return <span className={`admin-chip ${styles[difficulty]}`}>{labels[difficulty]}</span>;
}

function valueOr<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

function numberValue(value: number | undefined) {
  return value === undefined ? "غير متاح" : value.toLocaleString("ar");
}

function ratio(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function csvCell(value: unknown) {
  const normalized = String(value ?? "").replace(/"/g, '""');
  return `"${normalized}"`;
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return date.toLocaleDateString("ar-JO");
}
