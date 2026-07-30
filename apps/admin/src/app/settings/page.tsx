"use client";

import { ChangePasswordForm } from "@/components/ChangePasswordForm";

// إدارة feature_flags (docs/database-design.md، docs/deployment-plan.md: الإطلاق التدريجي عبر Feature Flag)
const FLAGS = [
  { key: "alemancenter_ad_lesson", label: "إعلان داخل الدرس على موقع الإيمان" },
  { key: "alemancenter_ad_homepage", label: "بطاقة الصفحة الرئيسية على موقع الإيمان" },
  { key: "ai_content_assist", label: "مساعدة الذكاء الاصطناعي في إنتاج المحتوى" },
  { key: "achievements_visual_effects", label: "المؤثرات البصرية للإنجازات" },
];

export default function AdminSettingsPage() {
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
        <ul className="mt-4 divide-y divide-slate-100">
          {FLAGS.map((f) => (
            <li key={f.key} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold text-slate-800">{f.label}</span>
              <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-500">{f.key}</code>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          القيم الحية مبذورة في services/api/migrations/0007_admin_audit.up.sql.
          التبديل الفعلي يُبنى عبر مسار إدارة مخصص لاحقًا.
        </p>
      </section>
    </div>
  );
}
