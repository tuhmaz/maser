"use client";

import { api } from "@/lib/api";
import { useSiteSettings } from "@/lib/site-settings";

// تظهر الأزرار فقط عندما يضبط الأدمن بيانات اعتماد المزوّد في متغيرات البيئة
// (docs/security-requirements.md: لا نعرض خيارًا لا يعمل).
export function OAuthButtons() {
  const { oauthProviders } = useSiteSettings();
  if (!oauthProviders.google && !oauthProviders.facebook) return null;

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        أو تابع عبر
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {oauthProviders.google && (
          <a
            href={api.oauthStartUrl("google")}
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            <GoogleIcon /> Google
          </a>
        )}
        {oauthProviders.facebook && (
          <a
            href={api.oauthStartUrl("facebook")}
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            <FacebookIcon /> Facebook
          </a>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.55-1.84.87-3.06.87-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.95 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.94a9 9 0 0 0 0 8.08l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .94 4.96l3.01 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M18 9a9 9 0 1 0-10.4 8.89v-6.29H5.31V9h2.29V7.02c0-2.26 1.35-3.51 3.41-3.51.99 0 2.02.18 2.02.18v2.22h-1.14c-1.12 0-1.47.7-1.47 1.41V9h2.5l-.4 2.6h-2.1v6.29A9 9 0 0 0 18 9Z"
      />
    </svg>
  );
}
