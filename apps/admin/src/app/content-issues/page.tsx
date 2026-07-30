"use client";

import { useEffect, useState } from "react";
import type { ContentIssue } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";

// بلاغات الأسئلة (question_reports) — لا يوجد بعد زر إبلاغ من واجهة الطالب،
// لذا القائمة قد تكون فارغة حتى تُضاف نقطة إبلاغ للطلاب في مرحلة لاحقة.
export default function ContentIssuesPage() {
  const [issues, setIssues] = useState<ContentIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    api.adminListContentIssues().then(setIssues).catch(() => setIssues([]));
  }
  useEffect(load, []);

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
      <header>
        <p className="admin-eyebrow">جودة المحتوى</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">مشاكل المحتوى</h1>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {issues.length === 0 && <div className="admin-empty">لا توجد بلاغات مفتوحة حاليًا.</div>}

      <div className="space-y-3">
        {issues.map((i) => (
          <article key={i.id} className="admin-surface flex flex-wrap items-start justify-between gap-3 p-5">
            <div>
              <p className="font-semibold text-slate-950">{i.questionBody}</p>
              <p className="mt-1 text-sm text-slate-500">{i.reason}</p>
            </div>
            {i.status === "open" ? (
              <Button disabled={busyId === i.id} onClick={() => resolve(i.id)}>معالجة</Button>
            ) : (
              <span className="rounded-md bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">تمت المعالجة</span>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
