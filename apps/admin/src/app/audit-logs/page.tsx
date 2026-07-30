"use client";

import { useEffect, useState } from "react";
import type { AuditLogEntry } from "@alemedu/api-client";
import { api } from "@/lib/api";

// سجل تدقيق عمليات الإدارة الحساسة — docs/security-requirements.md.
export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.adminListAuditLogs().then(setLogs).catch((err: any) => setError(err?.message ?? "تعذّر جلب سجل التدقيق"));
  }, []);

  return (
    <div className="space-y-5">
      <header>
        <p className="admin-eyebrow">الأمان</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">سجل التدقيق</h1>
        <p className="mt-2 max-w-3xl leading-7 text-slate-600">آخر 200 عملية إدارية حساسة.</p>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="admin-surface overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-bold">الوقت</th>
              <th className="px-4 py-3 font-bold">المنفّذ</th>
              <th className="px-4 py-3 font-bold">العملية</th>
              <th className="px-4 py-3 font-bold">الكيان</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                  {new Date(l.createdAt).toLocaleString("ar")}
                </td>
                <td className="px-4 py-3 text-slate-600">{l.actorEmail || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-950">{l.action}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{l.entityType}{l.entityId ? `#${l.entityId.slice(0, 8)}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <p className="p-5 text-sm text-slate-500">لا توجد عمليات مسجَّلة بعد.</p>}
      </div>
    </div>
  );
}
