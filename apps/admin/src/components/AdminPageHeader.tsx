import type { ReactNode } from "react";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="admin-page-header">
      <div>
        <p className="admin-eyebrow">{eyebrow}</p>
        <h1 className="admin-page-title">{title}</h1>
        {description && <p className="admin-page-copy">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function AdminEmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="admin-empty">
      {icon && <div className="mx-auto mb-3 flex w-fit text-[#9aa6b8]">{icon}</div>}
      <p className="font-black text-[#33415c]">{title}</p>
      {description && <p className="mt-1 text-xs">{description}</p>}
    </div>
  );
}

export function AdminStatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
}) {
  const styles = {
    success: "bg-[#e8f7f2] text-[#159b72]",
    warning: "bg-[#fff4e5] text-[#b86f08]",
    danger: "bg-[#ffeded] text-[#d64f5b]",
    info: "bg-[#eaf2ff] text-[#1565d8]",
    neutral: "bg-[#eef1f5] text-[#64718a]",
  };
  return <span className={`admin-chip ${styles[tone]}`}>{label}</span>;
}
