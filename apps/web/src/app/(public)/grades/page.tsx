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
    <main dir="rtl" className="page-shell">
      <header className="mb-6">
        <p className="eyebrow">الصفوف</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">الصفوف المتاحة</h1>
        <p className="mt-2 text-slate-600">نطاق التجربة الأولى مثبت على الصف السابع.</p>
      </header>
      {grades.length === 0 ? (
        <p className="empty-state">
          لا توجد صفوف متاحة حاليًا (تأكد من تشغيل الـ API وتطبيق الترحيلات).
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {grades.map((g) => (
            <li key={g.id} className="surface px-5 py-4 font-bold text-slate-950">
              {g.name}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
