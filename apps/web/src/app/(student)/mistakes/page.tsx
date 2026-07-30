"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BrainCircuit, CalendarClock, RefreshCcw, Sparkles } from "lucide-react";
import type { MistakeItem } from "@alemedu/api-client";
import { api } from "@/lib/api";

export default function MistakesPage() {
  const [items, setItems] = useState<MistakeItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listMistakes()
      .then(setItems)
      .catch((err: any) => setError(err?.message ?? "تعذّر جلب فرص التحسن"));
  }, []);

  const dueToday = useMemo(() => items?.filter((item) => item.nextReviewAt && new Date(item.nextReviewAt) <= new Date()).length ?? 0, [items]);
  const repeated = useMemo(() => items?.filter((item) => item.mistakeCount > 1).length ?? 0, [items]);
  const weakSkills = useMemo(() => new Set(items?.map((item) => item.skillName)).size, [items]);

  return (
    <div className="space-y-6 enter-up">
      <header>
        <p className="eyebrow">فرص التحسن</p>
        <h1 className="student-page-title mt-2">كل خطأ يخبرنا بما نراجعه</h1>
        <p className="student-page-copy">لا يوجد عقاب أو حكم هنا. نحفظ الفكرة ونرجع إليها عندما يكون التدريب مفيداً.</p>
      </header>

      <section className="rounded-lg border border-[#f1dfac] bg-[#fff9e9] p-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f4b942] text-[#503400]">
            <Sparkles size={22} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-black text-slate-950">الخطأ جزء طبيعي من التعلم</h2>
            <p className="mt-1 text-sm leading-7 text-slate-600">المهم أن نفهم سببه ونراجعه على فترات حتى لا يتكرر.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: CalendarClock, label: "جاهزة اليوم", value: dueToday, color: "bg-[#edf3ff] text-[#3568e8]" },
          { icon: RefreshCcw, label: "تكررت أكثر من مرة", value: repeated, color: "bg-[#fff3ec] text-[#d45c4b]" },
          { icon: BrainCircuit, label: "مهارات تحتاج دعماً", value: weakSkills, color: "bg-[#f1edff] text-[#6b52c7]" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="metric-card flex items-center gap-4">
              <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${item.color}`}>
                <Icon size={21} aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-500">{item.label}</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{item.value}</p>
              </div>
            </article>
          );
        })}
      </section>

      {error && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}

      {items && items.length === 0 ? (
        <div className="empty-state">
          <AlertCircle className="mx-auto mb-3 text-slate-300" size={34} aria-hidden="true" />
          ستظهر هنا الأفكار التي تحتاج مراجعة بعد حل أول اختبار.
        </div>
      ) : (
        <div className="surface divide-y divide-[#edf0f5] overflow-hidden">
          {items?.map((item) => (
            <article key={item.id} className="p-5 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black text-[#3568e8]">{item.skillName}</p>
                  <p className="mt-2 font-bold leading-7 text-slate-900">{item.questionBody}</p>
                </div>
                <span className="status-chip bg-[#fff3ec] text-[#d45c4b]">
                  راجعناها {item.mistakeCount} {item.mistakeCount === 1 ? "مرة" : "مرات"}
                </span>
              </div>
              {item.nextReviewAt && (
                <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <CalendarClock size={15} aria-hidden="true" />
                  المراجعة القادمة: {new Date(item.nextReviewAt).toLocaleDateString("ar")}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
