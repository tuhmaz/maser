import Link from "next/link";
import { Button } from "@alemedu/ui";

// الصفحة الرئيسية "/" — راجع docs/user-journeys.md (خطوة 1-2 من رحلة الطالب الأولى)
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-bold">Alemedu</h1>
      <p className="text-lg text-gray-600">
        منصة تحدد مستوى الطالب، وتخبره بما يجب أن يدرسه اليوم، وتختبره، وتحفظ
        أخطاءه، ثم تعيد تدريبه عليها حتى يتقن المهارة.
      </p>

      <div className="flex gap-4">
        <Link href="/register">
          <Button variant="primary">ابدأ مجانًا</Button>
        </Link>
        <Link href="/login">
          <Button variant="secondary">تسجيل الدخول</Button>
        </Link>
      </div>

      <div className="mt-8 flex gap-6 text-sm text-gray-500">
        <Link href="/grades">الصفوف</Link>
        <Link href="/subjects">المواد</Link>
        <Link href="/free-test">اختبار تجريبي</Link>
      </div>

      <p className="mt-10 text-xs text-gray-400">
        النسخة التجريبية الأولى: الصف السابع — الرياضيات — الأردن
      </p>
    </main>
  );
}
