import type { Metadata } from "next";
import "./globals.css";
import { AdminShell } from "@/components/AdminShell";

export const metadata: Metadata = {
  title: "Alemedu — لوحة الإدارة",
  description: "لوحة إدارة المناهج والأسئلة والمستخدمين لمنصة Alemedu.",
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen antialiased">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
