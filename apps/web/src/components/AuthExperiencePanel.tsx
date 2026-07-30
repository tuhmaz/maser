import { BrainCircuit, Check, Clock3, Target } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

export function AuthExperiencePanel() {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-[#17243d] p-10 text-white lg:flex lg:flex-col lg:justify-between">
      <BrandMark light />

      <div className="max-w-lg">
        <span className="status-chip bg-white/10 text-white">
          <Target size={15} aria-hidden="true" />
          تعلم يناسب مستواك
        </span>
        <h2 className="mt-5 text-4xl font-black leading-tight">ابدأ بخطوة واضحة، لا بقائمة طويلة من الدروس</h2>
        <p className="mt-4 text-base leading-8 text-white/70">
          Alemedu يرتب الجلسة حسب احتياجك، ويعيد لك الأفكار التي تحتاج تثبيتاً في الوقت المناسب.
        </p>

        <div className="mt-8 space-y-3">
          {[
            { icon: BrainCircuit, title: "تشخيص قصير", meta: "نعرف نقطة البداية" },
            { icon: Clock3, title: "مهمة يومية", meta: "10–15 دقيقة" },
            { icon: Check, title: "تقدم مفهوم", meta: "مهارة بعد مهارة" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-center gap-3 border-b border-white/10 pb-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-[#8bb0ff]">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-black">{item.title}</p>
                  <p className="mt-0.5 text-xs text-white/55">{item.meta}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs font-semibold text-white/45">التجربة الأولى · رياضيات الصف السابع · الأردن</p>
    </aside>
  );
}
