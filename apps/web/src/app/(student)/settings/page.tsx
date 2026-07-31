"use client";

import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { Bell, EyeOff, Gauge, Mail, ShieldCheck } from "lucide-react";
import type { User } from "@alemedu/api-client";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hideFromRanks, setHideFromRanks] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    api.me().then(setUser).catch(() => {});
  }, []);

  async function resendVerification() {
    setResending(true);
    try {
      await api.resendVerification();
      setResent(true);
    } finally {
      setResending(false);
    }
  }

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

      {user && !user.emailVerified && (
        <section className="surface flex flex-wrap items-center gap-4 border border-amber-200 bg-amber-50 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <Mail size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-black text-slate-950">بريدك الإلكتروني غير مفعّل</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {resent ? "أُرسل رابط تفعيل جديد إلى بريدك، تحقق من صندوق الوارد." : "فعّل بريدك لضمان استعادة حسابك عند نسيان كلمة المرور."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void resendVerification()}
            disabled={resending || resent}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-black text-white transition hover:bg-amber-700 disabled:opacity-60"
          >
            {resending ? "جارٍ الإرسال..." : resent ? "تم الإرسال" : "إعادة إرسال رابط التفعيل"}
          </button>
        </section>
      )}

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
