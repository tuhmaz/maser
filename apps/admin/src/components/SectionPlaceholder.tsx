export function SectionPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-5">
      <header>
        <p className="admin-eyebrow">Alemedu Admin</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">{title}</h1>
      </header>
      <div className="admin-empty">
        <p>{description}</p>
        <p className="mt-3 text-xs font-semibold text-slate-400">
          سيُربط هذا القسم بنقاط الإدارة المخصصة عند اكتمال عقد الـ API.
        </p>
      </div>
    </div>
  );
}
