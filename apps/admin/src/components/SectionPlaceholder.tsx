export function SectionPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="rounded-lg border border-dashed p-6 text-gray-500">{description}</div>
    </div>
  );
}
