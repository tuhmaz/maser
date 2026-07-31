import Link from "next/link";
import { ArrowLeft, Calculator, GraduationCap, Sparkles } from "lucide-react";
import { ApiClient } from "@alemedu/api-client";
import { BrandMark } from "@/components/BrandMark";

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
    <main dir="rtl" className="min-h-screen bg-[#f5f7fb] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <BrandMark />
        <header className="mt-12 max-w-2xl">
          <span className="status-chip bg-[#edf3ff] text-[#244fc2]">
            <GraduationCap size={15} aria-hidden="true" />
            الصفوف المتاحة
          </span>
          <h1 className="mt-4 text-3xl font-black text-slate-950 sm:text-4xl">ابدأ من صفك ومادتك</h1>
          <p className="mt-3 leading-8 text-slate-600">تبدأ التجربة الأولى برياضيات الصف السابع ضمن المنهاج الأردني.</p>
        </header>

        {grades.length === 0 ? (
          <div className="mt-8 empty-state">تعذّر تحميل الصفوف حالياً. حاول مرة أخرى بعد تشغيل خدمة المحتوى.</div>
        ) : (
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {grades.map((grade) => (
              <li key={grade.id}>
                <Link href="/register" className="surface interactive-card flex items-center gap-4 p-6">
                  <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#edf3ff] text-[#3568e8]">
                    <Calculator size={27} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-xs font-bold text-[#13827d]">
                      <Sparkles size={14} aria-hidden="true" />
                      الرياضيات متاحة
                    </span>
                    <span className="mt-2 block text-xl font-black text-slate-950">{grade.name}</span>
                  </span>
                  <ArrowLeft className="text-slate-300" size={20} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
