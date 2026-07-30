"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LockKeyhole, Mail } from "lucide-react";
import { loginSchema } from "@alemedu/validation";
import { Button } from "@alemedu/ui";
import { api, setTokens } from "@/lib/api";
import { AuthExperiencePanel } from "@/components/AuthExperiencePanel";
import { BrandMark } from "@/components/BrandMark";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "تحقق من البيانات المدخلة");
      return;
    }

    setLoading(true);
    try {
      const result = await api.login(parsed.data);
      setTokens(result);
      router.push(result.user.onboardingCompleted ? "/dashboard" : "/onboarding");
    } catch (err: any) {
      setError(err?.message ?? "تعذّر تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <AuthExperiencePanel />
      <section className="auth-panel">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <BrandMark />
          </div>
          <p className="eyebrow">مرحباً بعودتك</p>
          <h1 className="mt-3 text-3xl font-black text-slate-950">تابع من حيث توقفت</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">مهمتك اليومية وتقدمك محفوظان في حسابك.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="field-label" htmlFor="email">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
                <input
                  id="email"
                  dir="ltr"
                  type="email"
                  autoComplete="email"
                  className="pr-11 text-left"
                  placeholder="student@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="password">كلمة المرور</label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
                <input
                  id="password"
                  dir="ltr"
                  type="password"
                  autoComplete="current-password"
                  className="pr-11 text-left"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </div>

            {error && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "جارٍ الدخول..." : "تسجيل الدخول"}
              {!loading && <ArrowLeft size={18} aria-hidden="true" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            ليس لديك حساب؟{" "}
            <Link href="/register" className="font-black text-[#3568e8] hover:text-[#244fc2]">
              ابدأ مجاناً
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
