"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerSchema } from "@alemedu/validation";
import { Button } from "@alemedu/ui";
import { api, setTokens } from "@/lib/api";

// خطوة 3 من رحلة الطالب الأولى (docs/user-journeys.md): إنشاء الحساب
export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = registerSchema.safeParse({ email, password, displayName });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");
      return;
    }

    setLoading(true);
    try {
      const result = await api.register(parsed.data);
      setTokens(result);
      router.push("/onboarding");
    } catch (err: any) {
      setError(err?.message ?? "تعذّر إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="ltr" className="flex min-h-screen items-center justify-center px-5 py-10">
      <section dir="rtl" className="surface w-full max-w-[calc(100vw-2.5rem)] p-6 sm:max-w-md sm:p-8">
        <Link href="/" className="eyebrow">
          Alemedu
        </Link>
        <h1 className="mt-4 text-3xl font-black text-slate-950">إنشاء حساب</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          دقائق قليلة ثم تبدأ بتحديد مستواك وبناء خطتك اليومية.
        </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
        <input
          type="text"
          placeholder="الاسم"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <input
          type="email"
          placeholder="البريد الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={loading}>
          {loading ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
        </Button>
      </form>
        <p className="mt-5 text-sm text-slate-600">
          لديك حساب؟{" "}
          <Link href="/login" className="font-semibold text-teal-700 hover:underline">
            سجّل الدخول
          </Link>
        </p>
      </section>
    </main>
  );
}
