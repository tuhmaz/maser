import type { ButtonHTMLAttributes } from "react";

// مكوّن أساسي مشترك بين apps/web و apps/admin.
// قواعد التصميم (docs/user-journeys.md): أزرار رئيسية واضحة، دعم كامل للعربية وRTL.

type Variant = "primary" | "secondary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantStyles: Record<Variant, string> = {
  primary: "bg-[#3568e8] text-white shadow-sm shadow-blue-900/10 hover:bg-[#244fc2]",
  secondary: "border border-[#dce3ef] bg-white text-slate-800 shadow-sm hover:border-[#b8c8ef] hover:bg-[#f4f7ff]",
  danger: "bg-rose-600 text-white shadow-sm shadow-rose-900/10 hover:bg-rose-700",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles[variant]} ${className}`}
      {...props}
    />
  );
}
