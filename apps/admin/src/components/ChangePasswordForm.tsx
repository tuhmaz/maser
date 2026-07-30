"use client";

import { useState } from "react";
import { Button } from "@alemedu/ui";
import { api, setTokens } from "@/lib/api";

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
      setTokens(result); // الجلسات القديمة أُلغيت — خزّن الرموز الجديدة فورًا
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
    <section className="rounded-lg border bg-white p-4">
      <h2 className="mb-3 text-lg font-semibold">تغيير كلمة المرور</h2>

      <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-3">
        <input
          className="rounded-lg border px-3 py-2"
          type="password"
          placeholder="كلمة المرور الحالية"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
        />
        <input
          className="rounded-lg border px-3 py-2"
          type="password"
          placeholder="كلمة المرور الجديدة (8 أحرف على الأقل)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />
        <input
          className="rounded-lg border px-3 py-2"
          type="password"
          placeholder="تأكيد كلمة المرور الجديدة"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && (
          <p className="text-sm text-green-600">
            تم تغيير كلمة المرور بنجاح. أُلغيت كل الجلسات الأخرى وبقيت جلستك الحالية نشطة.
          </p>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? "جارٍ التغيير..." : "تغيير كلمة المرور"}
        </Button>
      </form>
    </section>
  );
}
