import Link from "next/link";
import { Button } from "@alemedu/ui";

// /free-test: اختبار تجريبي بدون إنشاء حساب كامل (يُبنى مع محرك الاختبارات).
export default function FreeTestPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold">اختبار تجريبي</h1>
      <p className="text-gray-600">
        هذه الميزة قيد البناء ضمن محرك الاختبارات (docs/daily-plan-rules.md).
        يمكنك حاليًا إنشاء حساب لتجربة الاختبار التشخيصي الكامل.
      </p>
      <Link href="/register">
        <Button>إنشاء حساب</Button>
      </Link>
    </main>
  );
}
