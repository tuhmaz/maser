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
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <ChangePasswordForm />

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Feature Flags</h2>
        <ul className="flex flex-col gap-3">
          {FLAGS.map((f) => (
            <li key={f.key} className="flex items-center justify-between border-b pb-2 last:border-0">
              <span>{f.label}</span>
              <code className="text-xs text-gray-400">{f.key}</code>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-gray-500">
          القيم الحية مبذورة في services/api/migrations/0007_admin_audit.up.sql.
          التبديل الفعلي يُبنى عبر مسار إدارة مخصص لاحقًا.
        </p>
      </section>
    </div>
  );
}
