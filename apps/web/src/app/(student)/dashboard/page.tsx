import Link from "next/link";

// خطوة 10 من رحلة الطالب الأولى: فتح لوحة التحكم (docs/user-journeys.md)
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">لوحة الطالب</h1>
      <p className="text-gray-600">
        نظرة عامة سريعة. للمهمة التفصيلية اليوم انتقل إلى{" "}
        <Link href="/today" className="text-blue-600 underline">
          مهمتي اليوم
        </Link>
        .
      </p>
    </div>
  );
}
