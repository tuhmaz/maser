"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LockKeyhole, Mail, UserRound } from "lucide-react";
import { registerSchema } from "@alemedu/validation";
import { Button } from "@alemedu/ui";
import { api, applySession } from "@/lib/api";
import { AuthExperiencePanel } from "@/components/AuthExperiencePanel";
import { BrandMark } from "@/components/BrandMark";
import { OAuthButtons } from "@/components/OAuthButtons";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = registerSchema.safeParse({ email, password, displayName });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "تحقق من البيانات المدخلة");
      return;
    }

    setLoading(true);
    try {
      const result = await api.register(parsed.data);
      applySession(result);
      router.push("/onboarding");
    } catch (err: any) {
      setError(err?.message ?? "تعذّر إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" className="auth-shell">
      <AuthExperiencePanel />
      <section className="auth-panel">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>
          <p className="eyebrow">حسابك التعليمي</p>
          <h1 className="mt-3 text-3xl font-black text-slate-950">لنبدأ من مستواك الحقيقي</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">أنشئ حسابك، ثم أجب عن اختبار قصير لنجهز أول مهمة لك.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <Field icon={UserRound} label="الاسم" id="display-name">
              <input id="display-name" type="text" autoComplete="name" className="pr-11" placeholder="اسم الطالب" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </Field>
            <Field icon={Mail} label="البريد الإلكتروني" id="register-email">
              <input id="register-email" dir="ltr" type="email" autoComplete="email" className="pr-11 text-left" placeholder="student@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
            </Field>
            <Field icon={LockKeyhole} label="كلمة المرور" id="register-password">
              <input id="register-password" dir="ltr" type="password" autoComplete="new-password" className="pr-11 text-left" placeholder="8 أحرف على الأقل" value={password} onChange={(event) => setPassword(event.target.value)} />
            </Field>

            {error && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "ننشئ حسابك..." : "إنشاء الحساب والمتابعة"}
              {!loading && <ArrowLeft size={18} aria-hidden="true" />}
            </Button>
          </form>

          <OAuthButtons />

          <p className="mt-6 text-center text-sm text-slate-600">
            لديك حساب؟{" "}
            <Link href="/login" className="font-black text-[#3568e8] hover:text-[#244fc2]">سجّل الدخول</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function Field({
  icon: Icon,
  label,
  id,
  children,
}: {
  icon: typeof UserRound;
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}
