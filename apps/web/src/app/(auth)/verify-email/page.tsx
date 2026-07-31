"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@alemedu/ui";
import { api } from "@/lib/api";
import { BrandMark } from "@/components/BrandMark";

function VerifyEmailContent() {
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    api
      .verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <BrandMark compact />
        </div>

        {status === "loading" && (
          <>
            <Loader2 className="mx-auto animate-spin text-slate-400" size={40} aria-hidden="true" />
            <p className="mt-4 text-sm font-bold text-slate-600">جارٍ تفعيل بريدك الإلكتروني...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto text-emerald-500" size={44} aria-hidden="true" />
            <h1 className="mt-4 text-xl font-black text-slate-950">تم تفعيل بريدك الإلكتروني</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">يمكنك الآن متابعة استخدام حسابك بكامل الميزات.</p>
            <Link href="/dashboard" className="mt-6 block">
              <Button className="w-full">الذهاب إلى لوحتي</Button>
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="mx-auto text-rose-500" size={44} aria-hidden="true" />
            <h1 className="mt-4 text-xl font-black text-slate-950">رابط التفعيل غير صالح</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">قد يكون الرابط منتهي الصلاحية أو استُخدم من قبل. يمكنك طلب رابط جديد من إعدادات حسابك.</p>
            <Link href="/settings" className="mt-6 block">
              <Button variant="secondary" className="w-full">الذهاب إلى الإعدادات</Button>
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
