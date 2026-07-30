import Link from "next/link";
import { Button } from "@alemedu/ui";

// /free-test: اختبار تجريبي بدون إنشاء حساب كامل (يُبنى مع محرك الاختبارات).
export default function FreeTestPage() {
  return (
    <main dir="ltr" className="flex min-h-screen items-center justify-center px-5 py-10">
      <section dir="rtl" className="surface w-full max-w-[calc(100vw-2.5rem)] p-6 text-center sm:max-w-xl sm:p-8">
      <p className="eyebrow">اختبار تجريبي</p>
      <h1 className="mt-2 text-3xl font-black text-slate-950">اختبار قصير قبل التسجيل الكامل</h1>
      <p className="mt-3 leading-7 text-slate-600">
        هذه الميزة قيد البناء ضمن محرك الاختبارات (docs/daily-plan-rules.md).
        يمكنك حاليًا إنشاء حساب لتجربة الاختبار التشخيصي الكامل.
      </p>
      <Link href="/register" className="mt-6 inline-flex">
        <Button>إنشاء حساب</Button>
      </Link>
      </section>
    </main>
  );
}
