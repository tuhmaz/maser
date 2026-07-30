"use client";

import { useEffect, useState } from "react";
import { CircleUserRound, Flame, Mail, UserPlus } from "lucide-react";
import type { ChildProgress, IncomingLinkRequest, User } from "@alemedu/api-client";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";

// /family: ربط حسابات ولي الأمر — docs/user-journeys.md (ولي الأمر يتابع التقدم
// دون تفاصيل تعليمية غير ضرورية). الطالب يوافق صراحةً على أي طلب ربط.
export default function FamilyPage() {
  const [me, setMe] = useState<User | null>(null);
  const [incoming, setIncoming] = useState<IncomingLinkRequest[]>([]);
  const [children, setChildren] = useState<ChildProgress[]>([]);
  const [studentEmail, setStudentEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function load() {
    api.me().then(setMe).catch(() => {});
    api.parentIncomingRequests().then(setIncoming).catch(() => setIncoming([]));
    api.parentChildren().then(setChildren).catch(() => setChildren([]));
  }
  useEffect(load, []);

  async function respond(parentUserId: string, approve: boolean) {
    setError(null);
    try {
      await api.parentRespondToRequest(parentUserId, approve);
      load();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر تنفيذ الطلب");
    }
  }

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await api.parentRequestLink(studentEmail);
      setSuccess("أُرسل طلب الربط — بانتظار موافقة الطالب.");
      setStudentEmail("");
    } catch (err: any) {
      setError(err?.message ?? "تعذّر إرسال الطلب");
    }
  }

  return (
    <div className="space-y-6 enter-up">
      <header>
        <p className="eyebrow">العائلة</p>
        <h1 className="student-page-title mt-2">ابقَ قريبًا دون تفاصيل زائدة</h1>
        <p className="student-page-copy">يتابع ولي الأمر التقدم العام فقط، ولا يتم الربط إلا بموافقتك الصريحة.</p>
      </header>

      {error && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}
      {success && <p className="rounded-lg bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800">{success}</p>}

      {incoming.length > 0 && (
        <section className="surface p-6">
          <h2 className="text-lg font-black text-slate-950">طلبات ربط بانتظار موافقتك</h2>
          <div className="mt-4 space-y-3">
            {incoming.map((r) => (
              <div key={r.parentUserId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e7ebf3] p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#edf3ff] text-[#3568e8]">
                    <CircleUserRound size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-bold text-slate-950">{r.parentName}</p>
                    <p className="text-xs text-slate-500">{r.parentEmail}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => respond(r.parentUserId, true)}>موافقة</Button>
                  <Button variant="secondary" onClick={() => respond(r.parentUserId, false)}>رفض</Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {me?.role === "parent" && (
        <section className="surface p-6">
          <h2 className="text-lg font-black text-slate-950">ربط بحساب طالب</h2>
          <form onSubmit={requestLink} className="mt-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[14rem]">
              <Mail className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
              <input
                type="email"
                required
                placeholder="بريد حساب الطالب"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                className="w-full rounded-md border border-slate-200 py-2 pl-3 pr-9 text-sm"
              />
            </div>
            <Button type="submit">
              <UserPlus size={17} aria-hidden="true" />
              إرسال طلب ربط
            </Button>
          </form>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-black text-slate-950">
          {me?.role === "parent" ? "أبناؤك المرتبطون" : "الأشخاص المرتبطون بحسابك"}
        </h2>
        {children.length === 0 ? (
          <div className="empty-state">لا يوجد ربط نشط بعد.</div>
        ) : (
          <div className="surface divide-y divide-[#edf0f5] overflow-hidden">
            {children.map((c) => (
              <div key={c.studentUserId} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="font-black text-slate-950">{c.displayName}</p>
                  <p className="mt-1 text-xs text-slate-500">{c.gradeName || "—"}</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <Flame size={15} className="text-[#b97700]" aria-hidden="true" />
                    {c.currentStreak} يوم متواصل
                  </span>
                  <span>{c.masteredSkills} مهارة متقنة</span>
                  {c.lastQuizScore != null && <span>آخر نتيجة: {Math.round(c.lastQuizScore)}%</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
