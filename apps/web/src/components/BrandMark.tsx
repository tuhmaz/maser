import Link from "next/link";
import { BookOpenCheck } from "lucide-react";

export function BrandMark({
  compact = false,
  light = false,
}: {
  compact?: boolean;
  light?: boolean;
}) {
  return (
    <Link href="/" className="inline-flex items-center gap-3" aria-label="Alemedu - الصفحة الرئيسية">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          light ? "bg-white text-[#3568e8]" : "bg-[#3568e8] text-white"
        }`}
      >
        <BookOpenCheck size={22} strokeWidth={2.4} aria-hidden="true" />
      </span>
      {!compact && (
        <span className={light ? "text-white" : "text-slate-950"}>
          <span className="block text-lg font-black leading-none">Alemedu</span>
          <span className={`mt-1 block text-[11px] font-semibold ${light ? "text-white/70" : "text-slate-500"}`}>
            تعلم يناسبك
          </span>
        </span>
      )}
    </Link>
  );
}
