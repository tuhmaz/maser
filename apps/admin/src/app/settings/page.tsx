"use client";

import { useEffect, useState } from "react";
import type { AdminFeatureFlag } from "@alemedu/api-client";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { api } from "@/lib/api";

const FLAG_LABELS: Record<string, string> = {
  alemancenter_ad_lesson: "إعلان داخل الدرس على موقع الإيمان",
  alemancenter_ad_homepage: "بطاقة الصفحة الرئيسية على موقع الإيمان",
  ai_content_assist: "مساعدة الذكاء الاصطناعي في إنتاج المحتوى",
  achievements_visual_effects: "المؤثرات البصرية للإنجازات",
};

// إدارة feature_flags — docs/deployment-plan.md: الإطلاق التدريجي عبر Feature Flag.
// التبديل هنا حقيقي: يكتب إلى قاعدة البيانات وتقرأه الواجهات فورًا عبر GET /feature-flags.
export default function AdminSettingsPage() {
  const [flags, setFlags] = useState<AdminFeatureFlag[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  function load() {
    api.adminListFeatureFlags().then(setFlags).catch((err: any) => setError(err?.message ?? "تعذّر جلب الأعلام"));
  }
  useEffect(load, []);

  async function toggle(flag: AdminFeatureFlag) {
    setBusyKey(flag.key);
    setError(null);
    try {
      await api.adminUpdateFeatureFlag(flag.key, { isEnabled: !flag.isEnabled });
      load();
    } catch (err: any) {
      setError(err?.message ?? "تعذّر تحديث العلم");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="admin-eyebrow">الإعدادات</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">التحكم والصلاحيات</h1>
        <p className="mt-2 max-w-3xl leading-7 text-slate-600">
          إعدادات تشغيلية لا تغيّر نطاق النسخة التجريبية إلا عبر قرار موثق.
        </p>
      </header>

      <ChangePasswordForm />

      <section className="admin-surface p-5">
        <h2 className="text-lg font-black text-slate-950">Feature Flags</h2>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <ul className="mt-4 divide-y divide-slate-100">
          {flags.map((f) => (
            <li key={f.key} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="font-semibold text-slate-800">{FLAG_LABELS[f.key] ?? f.key}</span>
                <code className="mr-2 rounded bg-slate-100 px-2 py-1 text-xs text-slate-500">{f.key}</code>
              </div>
              <button
                type="button"
                disabled={busyKey === f.key}
                onClick={() => toggle(f)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${f.isEnabled ? "bg-teal-600" : "bg-slate-300"}`}
                aria-pressed={f.isEnabled}
                aria-label={FLAG_LABELS[f.key] ?? f.key}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    f.isEnabled ? "translate-x-1" : "translate-x-6"
                  }`}
                />
              </button>
            </li>
          ))}
          {flags.length === 0 && !error && <p className="py-3 text-sm text-slate-500">جارٍ التحميل...</p>}
        </ul>
      </section>
    </div>
  );
}
