"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, RefreshCw, Search } from "lucide-react";
import type { AuditLogEntry } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";
import { AdminEmptyState, AdminPageHeader } from "@/components/AdminPageHeader";

const ACTION_LABELS: Record<string, string> = {
  "question.create": "إنشاء سؤال",
  "question.update": "تعديل سؤال",
  "question.submit_review": "إرسال سؤال للمراجعة",
  "question.review": "قرار مراجعة",
  "question.publish": "نشر سؤال",
  "question.archive": "أرشفة سؤال",
  "question.delete": "حذف مسودة",
  "user.change_role": "تغيير صلاحية",
  "content_issue.resolve": "معالجة بلاغ",
  "feature_flag.update": "تحديث ميزة",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api.adminListAuditLogs()
      .then(setLogs)
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب سجل التدقيق"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return logs;
    return logs.filter((log) =>
      [log.actorEmail, log.action, ACTION_LABELS[log.action], log.entityType, log.entityId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [logs, query]);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="الأمان والامتثال"
        title="سجل التدقيق"
        description="آخر 200 عملية إدارية حساسة مسجلة بواسطة الخادم."
        actions={<Button variant="secondary" onClick={load} disabled={loading}><RefreshCw size={17} className={loading ? "animate-spin" : ""} /> تحديث</Button>}
      />

      {error && <p role="alert" className="admin-error">{error}</p>}

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8d99ad]" size={17} />
        <input className="w-full pr-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث بالمنفذ أو العملية أو الكيان..." />
      </div>

      <section className="admin-surface overflow-hidden">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>الوقت</th><th>المنفّذ</th><th>العملية</th><th>نوع الكيان</th><th>المعرّف</th></tr></thead>
            <tbody className="divide-y divide-[#edf1f6]">
              {filtered.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap text-xs text-[#64718a]">{formatDate(log.createdAt)}</td>
                  <td className="font-bold text-[#33415c]">{log.actorEmail || "عملية نظام"}</td>
                  <td><span className="admin-chip bg-[#eaf2ff] text-[#1565d8]">{ACTION_LABELS[log.action] ?? log.action}</span></td>
                  <td className="text-[#526078]">{log.entityType}</td>
                  <td dir="ltr" className="text-left font-mono text-xs text-[#7b879c]">{log.entityId?.slice(0, 12) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && <div className="p-5"><AdminEmptyState title="لا توجد عمليات مطابقة" icon={<Activity size={30} />} /></div>}
      </section>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ar-JO");
}
