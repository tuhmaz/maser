import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Clock3,
  Flame,
  Lightbulb,
  NotebookPen,
  Play,
  Sparkles,
  Target,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6 enter-up">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">الخميس، 30 يوليو</p>
          <h1 className="student-page-title mt-2">صباح الخير، لننجز خطوة اليوم</h1>
          <p className="student-page-copy">مهمتك جاهزة ومبنية على آخر نتيجة لك.</p>
        </div>
        <span className="status-chip bg-white text-slate-600 shadow-sm">
          <Sparkles size={15} className="text-[#7c62d9]" aria-hidden="true" />
          مستواك يتحدث بعد كل إجابة
        </span>
      </header>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.72fr)]">
        <article className="relative overflow-hidden rounded-lg bg-[#3568e8] p-6 text-white shadow-[0_18px_40px_rgba(53,104,232,0.22)] sm:p-8">
          <div className="relative z-10 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="status-chip bg-white/15 text-white">
                <Target size={15} aria-hidden="true" />
                المهمة التالية
              </span>
              <span className="status-chip bg-[#f4b942] text-[#503400]">
                <Clock3 size={15} aria-hidden="true" />
                15 دقيقة
              </span>
            </div>
            <h2 className="mt-5 text-2xl font-black leading-tight sm:text-3xl">ابدأ بتشخيص مستواك في الرياضيات</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/80 sm:text-base">
              أسئلة قصيرة تساعدنا في اختيار المهارات المناسبة لك. النتيجة للتوجيه وليست للحكم.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                href="/today"
                className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-white px-5 text-sm font-black text-[#244fc2] transition hover:bg-[#f4f7ff]"
              >
                <Play size={18} fill="currentColor" aria-hidden="true" />
                ابدأ الآن
              </Link>
              <span className="text-xs font-bold text-white/70">يمكنك التوقف والمتابعة لاحقاً</span>
            </div>
          </div>
          <Brain
            className="absolute -bottom-10 -left-8 text-white/10"
            size={210}
            strokeWidth={1.1}
            aria-hidden="true"
          />
        </article>

        <aside className="surface p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-slate-950">إيقاع هذا الأسبوع</p>
              <p className="mt-1 text-xs text-slate-500">يكفي يوم واحد للبدء</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#fff4d8] text-[#b97700]">
              <Flame size={23} aria-hidden="true" />
            </span>
          </div>
          <div className="mt-6 grid grid-cols-7 gap-1.5 text-center">
            {["خ", "ج", "س", "ح", "ن", "ث", "ر"].map((day, index) => (
              <div key={day}>
                <span
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${
                    index === 0 ? "bg-[#3568e8] text-white" : "bg-[#f0f3f8] text-slate-400"
                  }`}
                >
                  {index === 0 ? "1" : "•"}
                </span>
                <span className="mt-2 block text-[10px] font-bold text-slate-400">{day}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-[#edf0f5] pt-4">
            <p className="flex items-start gap-2 text-xs leading-6 text-slate-600">
              <Lightbulb className="mt-0.5 shrink-0 text-[#f4b942]" size={17} aria-hidden="true" />
              الانتظام في جلسات قصيرة يساعد على تثبيت التعلم أكثر من جلسة طويلة متباعدة.
            </p>
          </div>
        </aside>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">صورتك التعليمية الآن</h2>
            <p className="mt-1 text-sm text-slate-500">ستصبح أدق مع كل جلسة.</p>
          </div>
          <Link href="/progress" className="flex items-center gap-1 text-sm font-black text-[#3568e8] hover:text-[#244fc2]">
            التفاصيل
            <ArrowLeft size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: BookOpen,
              label: "مهارات أتقنتها",
              value: "0",
              helper: "تظهر بعد التشخيص",
              color: "bg-[#e9f8f6] text-[#13827d]",
            },
            {
              icon: NotebookPen,
              label: "فرص تحتاج مراجعة",
              value: "0",
              helper: "سنرتبها في وقتها",
              color: "bg-[#fff3ec] text-[#d45c4b]",
            },
            {
              icon: Flame,
              label: "أيام التعلم",
              value: "0",
              helper: "ابدأ أول يوم الآن",
              color: "bg-[#fff4d8] text-[#b97700]",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="metric-card flex items-start gap-4">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
                  <Icon size={22} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-600">{item.label}</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{item.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.helper}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
