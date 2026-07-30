import Image from "next/image";
import Link from "next/link";
import { Button } from "@alemedu/ui";

const STEPS = [
  { title: "اختبار قصير", body: "ابدأ من مستوى الطالب الحقيقي بدل التخمين." },
  { title: "مهمة اليوم", body: "خطة 10 إلى 15 دقيقة تجمع شرحًا ومراجعة وأسئلة." },
  { title: "دفتر أخطاء", body: "كل خطأ يتحول إلى مراجعة في وقت مناسب." },
];

const SIGNALS = [
  ["الصف", "السابع"],
  ["المادة", "الرياضيات"],
  ["الدولة", "الأردن"],
];

export default function HomePage() {
  return (
    <main dir="ltr">
      <section className="relative isolate min-h-[88svh] overflow-hidden bg-white text-slate-950">
        <Image
          src="/images/alemedu-hero.png"
          alt="طالب يستخدم منصة Alemedu لمراجعة مهارات الرياضيات"
          fill
          priority
          sizes="100vw"
          className="object-cover object-left"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-white/74 to-white/96 sm:from-white/0 sm:via-white/50 sm:to-white/94" />

        <div dir="rtl" className="page-shell relative flex min-h-[88svh] max-w-full flex-col justify-between overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-3 py-4">
            <Link href="/" className="text-xl font-black tracking-normal text-slate-950">
              Alemedu
            </Link>
            <nav className="flex flex-wrap items-center gap-2 text-sm">
              <Link className="rounded-md px-3 py-2 font-semibold text-slate-700 transition hover:bg-white/70 hover:text-teal-800" href="/grades">
                الصفوف
              </Link>
              <Link className="rounded-md px-3 py-2 font-semibold text-slate-700 transition hover:bg-white/70 hover:text-teal-800" href="/free-test">
                اختبار تجريبي
              </Link>
              <Link href="/login">
                <Button variant="secondary" className="bg-white/80">
                  دخول
                </Button>
              </Link>
            </nav>
          </header>

          <div className="w-full max-w-xl pb-12 pt-10 sm:max-w-2xl sm:pb-16 lg:pb-20">
            <p className="mb-4 inline-flex rounded-md bg-amber-300 px-3 py-1 text-sm font-bold text-slate-950 shadow-sm">
              تجربة مجانية للصف السابع في الرياضيات
            </p>
            <h1 className="max-w-full text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Alemedu
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-700 sm:text-xl">
              منصة تحدد مستوى الطالب، تخبره بما يدرسه اليوم، تختبره، وتحفظ أخطاءه حتى يتقن المهارة.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register">
                <Button className="w-full bg-amber-300 text-slate-950 hover:bg-amber-200 sm:w-auto">
                  ابدأ مجانًا
                </Button>
              </Link>
              <Link href="/free-test">
                <Button variant="secondary" className="w-full bg-white/80 sm:w-auto">
                  جرّب اختبارًا قصيرًا
                </Button>
              </Link>
            </div>

            <dl className="mt-8 grid max-w-md grid-cols-3 gap-2">
              {SIGNALS.map(([label, value]) => (
                <div key={label} className="rounded-md border border-white/70 bg-white/72 p-3 shadow-sm backdrop-blur">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="mt-1 font-bold text-slate-950">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section dir="rtl" className="page-shell -mt-10 relative z-10 grid gap-3 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <article key={step.title} className="surface p-5">
            <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-teal-700 text-sm font-black text-white">
              {index + 1}
            </span>
            <h2 className="text-lg font-black text-slate-950">{step.title}</h2>
            <p className="mt-2 leading-7 text-slate-600">{step.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
