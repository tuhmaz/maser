"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import type { ContentIssue } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "@/components/AdminPageHeader";

export default function ContentIssuesPage() {
  const [issues, setIssues] = useState<ContentIssue[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api.adminListContentIssues()
      .then(setIssues)
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب البلاغات"))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const visibleIssues = useMemo(
    () => filter === "all" ? issues : issues.filter((issue) => issue.status === filter),
    [filter, issues],
  );
  const openCount = issues.filter((issue) => issue.status === "open").length;

  async function resolve(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api.adminResolveContentIssue(id);
      load();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر معالجة البلاغ");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="جودة المحتوى"
        title="بلاغات المحتوى"
        description="بلاغات مرتبطة بأسئلة فعلية. معالجة البلاغ تحدّث حالته في قاعدة البيانات وتسجل العملية."
        actions={<Button variant="secondary" onClick={load} disabled={loading}><RefreshCw size={17} className={loading ? "animate-spin" : ""} /> تحديث</Button>}
      />

      {error && <p role="alert" className="admin-error">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {[
          ["open", `المفتوحة (${openCount})`],
          ["resolved", `المعالجة (${issues.filter((issue) => issue.status === "resolved").length})`],
          ["all", `الكل (${issues.length})`],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value as typeof filter)}
            className={`min-h-9 rounded-lg border px-3 text-xs font-black ${filter === value ? "border-[#1565d8] bg-[#eaf2ff] text-[#1565d8]" : "border-[#dfe6f1] bg-white text-[#64718a]"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {visibleIssues.length === 0 && !loading ? (
        <AdminEmptyState title={filter === "open" ? "لا توجد بلاغات مفتوحة" : "لا توجد بلاغات مطابقة"} icon={<CheckCircle2 size={30} />} />
      ) : (
        <section className="admin-surface overflow-hidden">
          <div className="admin-divider-list">
            {visibleIssues.map((issue) => (
              <article key={issue.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${issue.status === "open" ? "bg-[#ffeded] text-[#d64f5b]" : "bg-[#e8f7f2] text-[#159b72]"}`}>
                    {issue.status === "open" ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminStatusBadge label={issue.status === "open" ? "مفتوح" : "تمت المعالجة"} tone={issue.status === "open" ? "danger" : "success"} />
                      <span className="text-xs text-[#7b879c]">{formatDate(issue.createdAt)}</span>
                    </div>
                    <p className="mt-3 font-black leading-7 text-[#12213f]">{issue.questionBody}</p>
                    <p className="mt-2 text-sm leading-6 text-[#64718a]">{issue.reason}</p>
                  </div>
                </div>
                {issue.status === "open" && (
                  <Button disabled={busyId === issue.id} onClick={() => resolve(issue.id)}>
                    <CheckCircle2 size={17} />
                    {busyId === issue.id ? "جارٍ الحفظ..." : "تحديد كمعالج"}
                  </Button>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("ar-JO");
}
