import type { ButtonHTMLAttributes } from "react";

// مكوّن أساسي مشترك بين apps/web و apps/admin.
// قواعد التصميم (docs/user-journeys.md): أزرار رئيسية واضحة، دعم كامل للعربية وRTL.

type Variant = "primary" | "secondary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantStyles: Record<Variant, string> = {
  primary: "bg-teal-700 text-white shadow-sm shadow-teal-900/10 hover:bg-teal-800",
  secondary: "border border-slate-200 bg-white text-slate-900 shadow-sm hover:border-teal-200 hover:bg-teal-50",
  danger: "bg-rose-600 text-white shadow-sm shadow-rose-900/10 hover:bg-rose-700",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles[variant]} ${className}`}
      {...props}
    />
  );
}
