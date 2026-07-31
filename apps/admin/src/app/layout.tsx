import type { Metadata } from "next";
import "./globals.css";
import { AdminShell } from "@/components/AdminShell";
import { SiteSettingsProvider } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Alemedu — لوحة الإدارة",
  description: "لوحة إدارة المناهج والأسئلة والمستخدمين لمنصة Alemedu.",
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="ltr">
      <body className="min-h-screen antialiased">
        <SiteSettingsProvider>
          <AdminShell>{children}</AdminShell>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
