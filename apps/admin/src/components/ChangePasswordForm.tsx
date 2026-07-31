"use client";

import { useState } from "react";
import { KeyRound, LockKeyhole, Save } from "lucide-react";
import { Button } from "@alemedu/ui";
import { api, applySession } from "@/lib/api";

// تغيير كلمة المرور من لوحة الإدارة.
// الخادم يلغي كل الجلسات القديمة ويصدر رموزًا جديدة لهذا الجهاز، فنخزّنها فورًا
// حتى يبقى الأدمن مسجَّل الدخول (docs/security-requirements.md).
export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("كلمة المرور الجديدة 8 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("تأكيد كلمة المرور لا يطابقها");
      return;
    }
    if (newPassword === currentPassword) {
      setError("كلمة المرور الجديدة يجب أن تختلف عن الحالية");
      return;
    }

    setLoading(true);
    try {
      const result = await api.changePassword({ currentPassword, newPassword });
      applySession(result); // الجلسات القديمة أُلغيت — خزّن الرمز الجديد فورًا
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err?.message ?? "تعذّر تغيير كلمة المرور");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="admin-surface overflow-hidden">
      <div className="flex items-center gap-3 border-b border-[#e7ecf3] bg-[#f8faff] p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f0edff] text-[#7357d4]"><KeyRound size={20} /></span>
        <div>
          <h2 className="font-black text-[#12213f]">تغيير كلمة المرور</h2>
          <p className="mt-1 text-xs text-[#64718a]">تُلغى الجلسات القديمة ويصدر الخادم رموزاً جديدة لهذه الجلسة.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid max-w-4xl gap-4 p-5 md:grid-cols-3">
        <PasswordField id="current-password" label="كلمة المرور الحالية" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
        <PasswordField id="new-password" label="كلمة المرور الجديدة" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
        <PasswordField id="confirm-password" label="تأكيد كلمة المرور" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />

        {error && <p className="admin-error md:col-span-3">{error}</p>}
        {success && (
          <p className="rounded-lg bg-[#e8f7f2] px-4 py-3 text-sm font-bold text-[#159b72] md:col-span-3">
            تم تغيير كلمة المرور بنجاح. أُلغيت كل الجلسات الأخرى وبقيت جلستك الحالية نشطة.
          </p>
        )}

        <Button type="submit" disabled={loading} className="md:col-span-3 md:w-fit">
          <Save size={17} />
          {loading ? "جارٍ التغيير..." : "تغيير كلمة المرور"}
        </Button>
      </form>
    </section>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-black text-[#526078]">{label}</label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8d99ad]" size={17} />
        <input id={id} type="password" className="w-full pr-9" value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} />
      </div>
    </div>
  );
}
