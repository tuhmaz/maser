"use client";

import { type Dispatch, type SetStateAction, useState } from "react";

// /settings: يطابق جدول student_preferences (docs/database-design.md).
// TODO: ربطها بنقطة API مخصصة عند إضافتها لعقد OpenAPI.
export default function SettingsPage() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hideFromRanks, setHideFromRanks] = useState(true);
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">الإعدادات</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">تفضيلات التجربة</h1>
      </header>

      <section className="surface divide-y divide-slate-100">
        {[
          [reducedMotion, setReducedMotion, "تقليل المؤثرات البصرية", "يبقي التجربة هادئة على الأجهزة الضعيفة."],
          [hideFromRanks, setHideFromRanks, "إخفاء ملفي من أي ترتيبات عامة مستقبلية", "النسخة الأولى لا تتضمن ترتيبات عامة، وهذا خيار خصوصية مبكر."],
          [notifications, setNotifications, "تفعيل الإشعارات", "يُستخدم لاحقًا للتذكير بالمهمة اليومية والمراجعة."],
        ].map(([checked, setter, label, helper]) => (
          <label key={label as string} className="flex cursor-pointer items-center justify-between gap-4 p-5">
            <span>
              <span className="block font-bold text-slate-950">{label as string}</span>
              <span className="mt-1 block text-sm text-slate-500">{helper as string}</span>
            </span>
            <input
              className="h-5 w-5 accent-teal-700"
              type="checkbox"
              checked={checked as boolean}
              onChange={(e) => (setter as Dispatch<SetStateAction<boolean>>)(e.target.checked)}
            />
          </label>
        ))}
      </section>
    </div>
  );
}
