"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginSchema } from "@alemedu/validation";
import { Button } from "@alemedu/ui";
import { api, setTokens } from "@/lib/api";

export default function AdminLoginPage() {
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
      // القاعدة الذهبية: الواجهة لا تقرر الصلاحية. كل مسار /admin/* في الخادم
      // يتحقق من الدور بنفسه (middleware.RequireRole)، وهذا الشرط هنا لتحسين UX فقط.
      if (!["admin", "super_admin", "content_editor", "content_reviewer", "support"].includes(result.user.role)) {
        setError("هذا الحساب لا يملك صلاحية الوصول إلى لوحة الإدارة");
        return;
      }
      setTokens(result);
      router.push("/");
    } catch (err: any) {
      setError(err?.message ?? "تعذّر تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="ltr" className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-10">
      <section dir="rtl" className="w-full max-w-[calc(100vw-2.5rem)] rounded-md border border-white/10 bg-white p-6 shadow-2xl shadow-black/30 sm:max-w-md sm:p-8">
        <p className="admin-eyebrow">Alemedu Admin</p>
        <h1 className="mt-3 text-3xl font-black text-slate-950">تسجيل دخول الإدارة</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          مخصص لفريق المحتوى والمراجعة والتشغيل.
        </p>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
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
          {loading ? "جارٍ الدخول..." : "دخول"}
        </Button>
      </form>
      </section>
    </main>
  );
}
