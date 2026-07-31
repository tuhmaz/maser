"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { PublicSiteSettings } from "@alemedu/api-client";
import { api } from "@/lib/api";

const DEFAULTS: PublicSiteSettings = {
  siteName: "Alemedu",
  oauthProviders: { google: false, facebook: false },
};

const SiteSettingsContext = createContext<PublicSiteSettings>(DEFAULTS);

// نفس نمط apps/web: يجلب هوية الموقع مرة واحدة ويوفّرها لشريط لوحة الإدارة
// وعنوان التبويب، حتى تنعكس تغييرات الاسم/الشعار من قسم الإعدادات فورًا.
export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PublicSiteSettings>(DEFAULTS);

  useEffect(() => {
    api.getSiteSettings().then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    document.title = `${settings.siteName} — لوحة الإدارة`;
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
