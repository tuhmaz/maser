import { SectionPlaceholder } from "@/components/SectionPlaceholder";

export default function CurriculumPage() {
  return (
    <SectionPlaceholder
      title="Curriculum"
      description="إنشاء وتعديل هيكل المنهاج (المرحلة → الصف → الفصل → المادة → الوحدة → الدرس → المهارة). راجع docs/curriculum-structure.md. يُبنى عبر /admin/curricula/*."
    />
  );
}
