"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { PublicSiteSettings } from "@alemedu/api-client";
import { api } from "@/lib/api";

const DEFAULTS: PublicSiteSettings = {
  siteName: "Alemedu",
  oauthProviders: { google: false, facebook: false },
};

const SiteSettingsContext = createContext<PublicSiteSettings>(DEFAULTS);

// يجلب هوية الموقع (اسم/شعار/عنوان/تواصل اجتماعي) مرة واحدة ويوفّرها لكل
// الصفحات — يتيح لإعدادات لوحة الإدارة الانعكاس على الواجهة الأمامية بالكامل
// دون تعديل كل صفحة يدويًا.
export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PublicSiteSettings>(DEFAULTS);

  useEffect(() => {
    api.getSiteSettings().then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    document.title = settings.tagline ? `${settings.siteName} | ${settings.tagline}` : settings.siteName;
    if (settings.faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = settings.faviconUrl;
    }
  }, [settings]);

  return <SiteSettingsContext.Provider value={settings}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
