import type { Metadata } from "next";
import "./globals.css";
import { SiteSettingsProvider } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Alemedu | تعلم ذكي يناسبك",
  description: "منصة تعليمية تكيّفية لطلاب الأردن تبني خطة يومية وتتابع إتقان المهارات.",
};

const themeScript = `
  (function () {
    try {
      var saved = localStorage.getItem("alemedu-theme");
      var theme = saved === "dark" || saved === "light"
        ? saved
        : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch (_) {
      document.documentElement.dataset.theme = "light";
    }
  })();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <SiteSettingsProvider>{children}</SiteSettingsProvider>
      </body>
    </html>
  );
}
