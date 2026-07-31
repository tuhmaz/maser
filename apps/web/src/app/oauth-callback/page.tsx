"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, XCircle } from "lucide-react";
import { bootstrapSession } from "@/lib/api";
import { BrandMark } from "@/components/BrandMark";

// لا رموز في رابط هذه الصفحة إطلاقًا (الخادم يضبط كوكي HttpOnly مباشرة في
// إعادة التوجيه من /auth/oauth/:provider/callback). كل ما نحتاجه هنا هو
// استدعاء /auth/refresh — الكوكي تُرسَل تلقائيًا وتُعيد رمز وصول وبيانات المستخدم.
export default function OAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    bootstrapSession().then((user) => {
      if (!user) {
        setError(true);
        return;
      }
      router.replace(user.onboardingCompleted ? "/dashboard" : "/onboarding");
    });
  }, [router]);

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <BrandMark compact />
        </div>
        {error ? (
          <>
            <XCircle className="mx-auto text-rose-500" size={44} aria-hidden="true" />
            <h1 className="mt-4 text-xl font-black text-slate-950">تعذّر تسجيل الدخول</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">حدث خطأ أثناء الدخول عبر المزوّد الخارجي. حاول مرة أخرى من صفحة الدخول.</p>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto animate-spin text-slate-400" size={40} aria-hidden="true" />
            <p className="mt-4 text-sm font-bold text-slate-600">جارٍ تسجيل دخولك...</p>
          </>
        )}
      </div>
    </main>
  );
}
