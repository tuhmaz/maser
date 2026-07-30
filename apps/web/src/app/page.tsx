import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BrainCircuit,
  Check,
  Clock3,
  NotebookPen,
  Play,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "@alemedu/ui";
import { BrandMark } from "@/components/BrandMark";

const LEARNING_STEPS = [
  {
    icon: BrainCircuit,
    number: "01",
    title: "نعرف نقطة البداية",
    body: "اختبار قصير يحدد المهارات التي تعرفها والتي تحتاج دعماً، بلا أحكام أو تخمين.",
    color: "bg-[#edf3ff] text-[#3568e8]",
  },
  {
    icon: Target,
    number: "02",
    title: "نرتب مهمة اليوم",
    body: "جلسة واضحة من 10 إلى 15 دقيقة، مقسمة إلى خطوات صغيرة يمكنك إنهاؤها.",
    color: "bg-[#e9f8f6] text-[#13827d]",
  },
  {
    icon: NotebookPen,
    number: "03",
    title: "نحوّل الخطأ إلى تقدم",
    body: "كل إجابة تحتاج تحسيناً تعود في الوقت المناسب حتى تثبت المهارة.",
    color: "bg-[#fff3ec] text-[#d45c4b]",
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="relative isolate min-h-[88svh] overflow-hidden bg-white">
        <Image
          src="/images/alemedu-hero.png"
          alt="طالب في المرحلة المتوسطة يتعلم الرياضيات باستخدام جهاز لوحي"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[34%_center] md:object-left"
        />
        <div className="absolute inset-y-0 right-0 w-full bg-white/90 md:w-[68%] md:bg-white/95 lg:w-[57%]" />

        <div className="relative mx-auto flex min-h-[88svh] w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
          <header className="flex min-h-20 items-center justify-between gap-4">
            <BrandMark />
            <nav className="flex items-center gap-2" aria-label="التنقل الرئيسي">
              <Link className="hidden px-3 py-2 text-sm font-bold text-slate-600 hover:text-[#3568e8] sm:block" href="#how">
                كيف يعمل؟
              </Link>
              <Link className="hidden px-3 py-2 text-sm font-bold text-slate-600 hover:text-[#3568e8] md:block" href="/free-test">
                اختبار تجريبي
              </Link>
              <Link href="/login">
                <Button variant="secondary">دخول</Button>
              </Link>
            </nav>
          </header>

          <div className="flex flex-1 items-center py-10">
            <div className="max-w-2xl enter-up">
              <span className="status-chip bg-[#fff4d8] text-[#865600]">
                <Sparkles size={15} aria-hidden="true" />
                تجربة مجانية لرياضيات الصف السابع
              </span>
              <h1 className="mt-5 text-5xl font-black leading-[1.15] text-slate-950 sm:text-6xl">
                Alemedu
              </h1>
              <p className="mt-4 text-2xl font-black leading-normal text-[#244fc2] sm:text-3xl">
                تعلّم الرياضيات بخطوة واضحة كل يوم
              </p>
              <p className="mt-5 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
                نحدد مستواك، نبني لك مهمة قصيرة، ونراجع معك ما يحتاج تثبيتاً حتى تفهم المهارة بثقة.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/register">
                  <Button className="w-full px-6 sm:w-auto">
                    ابدأ مجاناً
                    <ArrowLeft size={18} aria-hidden="true" />
                  </Button>
                </Link>
                <Link href="/free-test">
                  <Button variant="secondary" className="w-full sm:w-auto">
                    <Play size={17} aria-hidden="true" />
                    جرّب اختباراً قصيراً
                  </Button>
                </Link>
              </div>

              <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-slate-600">
                {["10–15 دقيقة يومياً", "مبني على مستواك", "بدون ترتيب أو منافسة"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e9f8f6] text-[#13827d]">
                      <Check size={13} strokeWidth={3} aria-hidden="true" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="bg-[#f5f7fb] py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="eyebrow">رحلة تعلم مدروسة</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
              أقل تشتيتاً. أكثر وضوحاً.
            </h2>
            <p className="mt-4 leading-8 text-slate-600">
              بدلاً من مكتبة طويلة من الدروس، يرى الطالب ما يحتاجه الآن وسبب ظهوره وما الذي حققه بعده.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {LEARNING_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <article key={step.title} className="surface interactive-card p-6">
                  <div className="flex items-center justify-between">
                    <span className={`flex h-12 w-12 items-center justify-center rounded-lg ${step.color}`}>
                      <Icon size={24} aria-hidden="true" />
                    </span>
                    <span className="text-sm font-black text-slate-300">{step.number}</span>
                  </div>
                  <h3 className="mt-6 text-lg font-black text-slate-950">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{step.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <p className="eyebrow">داخل يوم الطالب</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
              يعرف ما يفعل، ولماذا، وكم بقي
            </h2>
            <p className="mt-4 max-w-xl leading-8 text-slate-600">
              كل جلسة تبدأ بهدف واحد وتنتهي بإشارة تقدم مفهومة، حتى يبقى التركيز على التعلم لا على التنقل بين الشاشات.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="soft-panel">
                <Clock3 className="text-[#3568e8]" size={22} aria-hidden="true" />
                <p className="mt-3 font-black text-slate-950">وقت قصير ومحدد</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">جلسات يسهل البدء بها وإكمالها.</p>
              </div>
              <div className="soft-panel">
                <TrendingUp className="text-[#149c96]" size={22} aria-hidden="true" />
                <p className="mt-3 font-black text-slate-950">تقدم يمكن فهمه</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">المهارة التالية واضحة دائماً.</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#dfe5f0] bg-[#f9faff] p-4 shadow-[0_20px_50px_rgba(31,48,83,0.10)] sm:p-6">
            <div className="flex items-center justify-between border-b border-[#e3e8f2] pb-4">
              <div>
                <p className="text-xs font-bold text-[#3568e8]">مهمتك اليوم</p>
                <p className="mt-1 text-lg font-black text-slate-950">الكسور والأعداد النسبية</p>
              </div>
              <span className="status-chip bg-[#e9f8f6] text-[#13827d]">12 دقيقة</span>
            </div>
            <div className="mt-5 progress-track">
              <div className="progress-fill w-[40%]" />
            </div>
            <p className="mt-2 text-xs font-bold text-slate-500">خطوتان من خمس خطوات</p>
            <div className="mt-5 space-y-2">
              {[
                ["مراجعة سريعة", "مكتملة", true],
                ["فكرة اليوم", "ابدأ الآن", false],
                ["تدريب موجه", "4 أسئلة", false],
              ].map(([title, meta, complete]) => (
                <div key={title as string} className="flex items-center gap-3 rounded-lg bg-white p-3">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full ${complete ? "bg-[#149c96] text-white" : "bg-[#edf3ff] text-[#3568e8]"}`}>
                    {complete ? <Check size={17} aria-hidden="true" /> : <Target size={17} aria-hidden="true" />}
                  </span>
                  <p className="min-w-0 flex-1 text-sm font-bold text-slate-800">{title}</p>
                  <span className="text-xs font-semibold text-slate-500">{meta}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#17243d] py-14 text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div>
            <h2 className="text-2xl font-black sm:text-3xl">ابدأ من مستواك الحقيقي اليوم</h2>
            <p className="mt-2 text-sm leading-7 text-white/70">رياضيات الصف السابع، تجربة مجانية، وخطتك الأولى جاهزة بعد التشخيص.</p>
          </div>
          <Link href="/register">
            <Button className="bg-white text-[#244fc2] hover:bg-[#edf3ff]">
              إنشاء حساب مجاني
              <ArrowLeft size={18} aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
