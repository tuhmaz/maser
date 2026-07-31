"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Database, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { loginSchema } from "@alemedu/validation";
import { Button } from "@alemedu/ui";
import { api, applySession } from "@/lib/api";
import { ADMIN_PANEL_ROLES } from "@/lib/roles";

export default function AdminLoginPage() {
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
      setError(parsed.error.issues[0]?.message ?? "تحقق من بيانات الدخول");
      return;
    }

    setLoading(true);
    try {
      const result = await api.login(parsed.data);
      if (!ADMIN_PANEL_ROLES.includes(result.user.role)) {
        setError("لا تملك صلاحية للوصول إلى لوحة الإدارة");
        return;
      }
      applySession(result);
      router.push("/");
    } catch (err: any) {
      setError(err?.message ?? "تعذّر تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,0.9fr)_minmax(480px,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-[#062b66] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0bb7c4]">
            <ShieldCheck size={23} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xl font-black">Alemedu</p>
            <p className="mt-1 text-xs font-bold text-white/55">لوحة الإدارة</p>
          </div>
        </div>

        <div className="max-w-lg">
          <span className="admin-chip bg-white/10 text-white">
            <Database size={14} aria-hidden="true" />
            إدارة المحتوى والتشغيل
          </span>
          <h1 className="mt-5 text-4xl font-black leading-tight">قرارات واضحة من بيانات حقيقية</h1>
          <p className="mt-4 text-sm leading-8 text-white/65">
            تابع جودة بنك الأسئلة، دورة المراجعة، تقدم المحتوى، وسجل العمليات من مكان واحد.
          </p>
          <div className="mt-8 border-r-2 border-[#0bb7c4] pr-4">
            <p className="text-sm font-black">وصول محمي حسب الصلاحيات</p>
            <p className="mt-2 text-xs leading-6 text-white/55">جميع عمليات النشر وتغيير الأدوار مسجلة في سجل التدقيق.</p>
          </div>
        </div>

        <p className="text-xs text-white/40">Alemedu Admin · بيئة تشغيل المحتوى</p>
      </aside>

      <section className="flex min-h-screen items-center justify-center bg-[#f8fafd] px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0bb7c4] text-white">
              <ShieldCheck size={21} aria-hidden="true" />
            </span>
            <div>
              <p className="text-lg font-black text-[#12213f]">Alemedu</p>
              <p className="text-[10px] font-bold text-[#64718a]">لوحة الإدارة</p>
            </div>
          </div>

          <p className="admin-eyebrow">دخول الإدارة</p>
          <h2 className="mt-3 text-3xl font-black text-[#12213f]">مرحباً بعودتك</h2>
          <p className="mt-3 text-sm leading-7 text-[#64718a]">استخدم حساب المدير المعتمد للوصول إلى بيانات التشغيل.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="admin-email" className="mb-2 block text-sm font-black text-[#33415c]">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8d99ad]" size={18} aria-hidden="true" />
                <input
                  id="admin-email"
                  dir="ltr"
                  type="email"
                  autoComplete="email"
                  className="w-full pr-10 text-left"
                  placeholder="admin@alemedu.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="mb-2 block text-sm font-black text-[#33415c]">كلمة المرور</label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8d99ad]" size={18} aria-hidden="true" />
                <input
                  id="admin-password"
                  dir="ltr"
                  type="password"
                  autoComplete="current-password"
                  className="w-full pr-10 text-left"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </div>

            {error && <p role="alert" className="admin-error">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "جارٍ التحقق..." : "دخول لوحة الإدارة"}
              {!loading && <ArrowLeft size={18} aria-hidden="true" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs leading-6 text-[#7b879c]">
            الوصول مقصور على الأدوار الإدارية المعتمدة، وكل قسم داخل اللوحة محكوم بصلاحيات الخادم.
          </p>
        </div>
      </section>
    </main>
  );
}
