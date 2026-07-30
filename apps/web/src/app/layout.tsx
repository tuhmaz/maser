import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alemedu — منصة التعلم الذكي",
  description: "منصة تعليمية تكيّفية تحدد مستوى الطالب وتبني له خطة يومية وتحفظ أخطاءه حتى يتقن كل مهارة.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="ltr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
