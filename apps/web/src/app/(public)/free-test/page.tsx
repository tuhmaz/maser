import Link from "next/link";
import { ArrowLeft, BrainCircuit, Check, Clock3, Target } from "lucide-react";
import { Button } from "@alemedu/ui";
import { BrandMark } from "@/components/BrandMark";

export default function FreeTestPage() {
  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <BrandMark />
        <section className="mt-8 grid overflow-hidden rounded-lg border border-[#e3e8f2] bg-white shadow-[0_18px_45px_rgba(31,48,83,0.08)] md:grid-cols-[0.8fr_1.2fr]">
          <div className="bg-[#3568e8] p-7 text-white sm:p-9">
            <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-white/15">
              <BrainCircuit size={28} aria-hidden="true" />
            </span>
            <h1 className="mt-6 text-3xl font-black leading-tight">اختبار قصير يريك كيف نحدد نقطة البداية</h1>
            <p className="mt-4 text-sm leading-7 text-white/75">أسئلة رياضيات للصف السابع، بلا درجة مدرسية أو ترتيب.</p>
          </div>

          <div className="p-7 sm:p-9">
            <p className="eyebrow">التجربة المجانية</p>
            <h2 className="mt-3 text-2xl font-black text-slate-950">ماذا تتوقع؟</h2>
            <ul className="mt-6 space-y-4">
              {[
                { icon: Clock3, text: "نحو 10 دقائق" },
                { icon: Target, text: "أسئلة تتدرج حسب إجاباتك" },
                { icon: Check, text: "تقرير يوضح المهارات والخطوة التالية" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.text} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#edf3ff] text-[#3568e8]">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    {item.text}
                  </li>
                );
              })}
            </ul>
            <p className="mt-7 rounded-lg bg-[#fff9e9] p-4 text-xs leading-6 text-[#795516]">
              الاختبار التجريبي المباشر قيد التجهيز. يمكنك إنشاء حساب والبدء بتحديد المستوى الكامل الآن.
            </p>
            <Link href="/register" className="mt-6 inline-flex">
              <Button>
                ابدأ تحديد المستوى
                <ArrowLeft size={18} aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
