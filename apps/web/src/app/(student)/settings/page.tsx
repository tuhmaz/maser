"use client";

import { type Dispatch, type SetStateAction, useState } from "react";
import { Bell, EyeOff, Gauge, ShieldCheck } from "lucide-react";

export default function SettingsPage() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hideFromRanks, setHideFromRanks] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const options = [
    {
      icon: Gauge,
      checked: reducedMotion,
      setter: setReducedMotion,
      label: "تقليل الحركة",
      helper: "يخفف المؤثرات الانتقالية لتجربة أكثر هدوءاً.",
    },
    {
      icon: EyeOff,
      checked: hideFromRanks,
      setter: setHideFromRanks,
      label: "الخصوصية أولاً",
      helper: "إخفاء ملفي من أي ترتيبات عامة مستقبلية.",
    },
    {
      icon: Bell,
      checked: notifications,
      setter: setNotifications,
      label: "تذكيرات التعلم",
      helper: "تنبيه لطيف عند جاهزية المهمة أو المراجعة.",
    },
  ];

  return (
    <div className="space-y-6 enter-up">
      <header>
        <p className="eyebrow">الإعدادات</p>
        <h1 className="student-page-title mt-2">تجربة تناسبك</h1>
        <p className="student-page-copy">تحكم في هدوء الواجهة وخصوصيتك وطريقة التذكير.</p>
      </header>

      <section className="surface overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[#e3e8f2] bg-[#f9faff] p-5 sm:px-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e9f8f6] text-[#13827d]">
            <ShieldCheck size={21} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-black text-slate-950">تفضيلات الطالب</h2>
            <p className="mt-1 text-xs text-slate-500">لن تؤثر هذه الخيارات في درجاتك أو خطتك.</p>
          </div>
        </div>
        <div className="divide-y divide-[#edf0f5]">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <label key={option.label} className="flex cursor-pointer items-center gap-4 p-5 transition hover:bg-[#fbfcff] sm:px-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-black text-slate-950">{option.label}</span>
                  <span className="mt-1 block text-sm leading-6 text-slate-500">{option.helper}</span>
                </span>
                <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${option.checked ? "bg-[#3568e8]" : "bg-slate-300"}`}>
                  <input
                    className="sr-only"
                    type="checkbox"
                    checked={option.checked}
                    onChange={(event) => (option.setter as Dispatch<SetStateAction<boolean>>)(event.target.checked)}
                  />
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${option.checked ? "right-6" : "right-1"}`} />
                </span>
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
}
