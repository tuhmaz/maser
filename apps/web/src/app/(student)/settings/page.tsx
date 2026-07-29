"use client";

import { useState } from "react";

// /settings: يطابق جدول student_preferences (docs/database-design.md).
// TODO: ربطها بنقطة API مخصصة عند إضافتها لعقد OpenAPI.
export default function SettingsPage() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hideFromRanks, setHideFromRanks] = useState(true);
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">الإعدادات</h1>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={reducedMotion} onChange={(e) => setReducedMotion(e.target.checked)} />
        تقليل المؤثرات البصرية
      </label>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={hideFromRanks} onChange={(e) => setHideFromRanks(e.target.checked)} />
        إخفاء ملفي من أي ترتيبات عامة مستقبلية
      </label>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} />
        تفعيل الإشعارات
      </label>
    </div>
  );
}
