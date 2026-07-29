import { ApiClient } from "@alemedu/api-client";

// صفحة عامة (docs/user-journeys.md: /grades). تُعرَض بدون تسجيل دخول.
async function getGrades() {
  const api = new ApiClient({ baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080" });
  try {
    return await api.listGrades();
  } catch {
    return [];
  }
}

export default async function GradesPage() {
  const grades = await getGrades();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-6 text-2xl font-bold">الصفوف المتاحة</h1>
      {grades.length === 0 ? (
        <p className="text-gray-500">
          لا توجد صفوف متاحة حاليًا (تأكد من تشغيل الـ API وتطبيق الترحيلات).
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {grades.map((g) => (
            <li key={g.id} className="rounded-lg border px-4 py-3">
              {g.name}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
