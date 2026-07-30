import { SectionPlaceholder } from "@/components/SectionPlaceholder";

export default function CurriculumPage() {
  return (
    <SectionPlaceholder
      title="المنهاج"
      description="إنشاء وتعديل هيكل المنهاج (المرحلة → الصف → الفصل → المادة → الوحدة → الدرس → المهارة). راجع docs/curriculum-structure.md. يُبنى عبر /admin/curricula/*."
    />
  );
}
