"use client";

import Link from "next/link";
import { BookOpenCheck } from "lucide-react";
import { useSiteSettings } from "@/lib/site-settings";

export function BrandMark({
  compact = false,
  light = false,
  href = "/",
}: {
  compact?: boolean;
  light?: boolean;
  href?: string;
}) {
  const settings = useSiteSettings();

  return (
    <Link href={href} className="inline-flex items-center gap-3" aria-label={`${settings.siteName} - الصفحة الرئيسية`}>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg ${
          light ? "bg-white text-[#3568e8]" : "bg-[#3568e8] text-white"
        }`}
      >
        {settings.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.logoUrl} alt={settings.siteName} className="h-full w-full object-cover" />
        ) : (
          <BookOpenCheck size={22} strokeWidth={2.4} aria-hidden="true" />
        )}
      </span>
      {!compact && (
        <span className={light ? "text-white" : "text-slate-950"}>
          <span className="block text-lg font-black leading-none">{settings.siteName}</span>
          <span className={`mt-1 block text-[11px] font-semibold ${light ? "text-white/70" : "text-slate-500"}`}>
            {settings.tagline || "تعلم يناسبك"}
          </span>
        </span>
      )}
    </Link>
  );
}
