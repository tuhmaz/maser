"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginSchema } from "@alemedu/validation";
import { Button } from "@alemedu/ui";
import { api, setAccessToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");
      return;
    }

    setLoading(true);
    try {
      const result = await api.login(parsed.data);
      setAccessToken(result.accessToken);
      router.push(result.user.onboardingCompleted ? "/dashboard" : "/onboarding");
    } catch (err: any) {
      setError(err?.message ?? "تعذّر تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-bold">تسجيل الدخول</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          className="rounded-lg border px-3 py-2"
          type="email"
          placeholder="البريد الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="rounded-lg border px-3 py-2"
          type="password"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={loading}>
          {loading ? "جارٍ الدخول..." : "تسجيل الدخول"}
        </Button>
      </form>
    </main>
  );
}
