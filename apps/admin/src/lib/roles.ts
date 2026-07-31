import type { Role } from "@alemedu/api-client";

// يجب أن تطابق أدوار لوحة الإدارة في services/api/internal/middleware/permissions.go
// (rolePermissions) — هذا تصفية عرض فقط لتحسين التجربة، الصلاحية الفعلية
// تُفرض دائمًا من الخادم لكل مسار على حدة.
export const ADMIN_PANEL_ROLES: Role[] = ["super_admin", "admin", "content_editor", "content_reviewer", "support"];

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "مدير أعلى",
  admin: "مدير النظام",
  content_editor: "محرر محتوى",
  content_reviewer: "مراجع محتوى",
  support: "دعم فني",
};

// كل قسم في الشريط الجانبي وأي الأدوار تستطيع رؤيته — يطابق صلاحيات الخادم
// تقريبًا (curriculum.*, questions.*, users.read, reports.read, settings.manage).
const FULL_ACCESS: Role[] = ["super_admin", "admin"];
export const SECTION_ROLES: Record<string, Role[]> = {
  "/": [...FULL_ACCESS, "content_editor", "content_reviewer", "support"],
  "/curriculum": [...FULL_ACCESS, "content_editor", "content_reviewer"],
  "/grades": [...FULL_ACCESS, "content_editor", "content_reviewer"],
  "/subjects": [...FULL_ACCESS, "content_editor", "content_reviewer"],
  "/units": [...FULL_ACCESS, "content_editor", "content_reviewer"],
  "/lessons": [...FULL_ACCESS, "content_editor", "content_reviewer"],
  "/skills": [...FULL_ACCESS, "content_editor", "content_reviewer"],
  "/questions": [...FULL_ACCESS, "content_editor", "content_reviewer"],
  "/quizzes": [...FULL_ACCESS, "content_editor", "content_reviewer"],
  "/reviews": [...FULL_ACCESS, "content_reviewer"],
  "/students": [...FULL_ACCESS, "support"],
  "/reports": [...FULL_ACCESS, "support"],
  "/content-issues": [...FULL_ACCESS, "content_reviewer", "support"],
  "/audit-logs": FULL_ACCESS,
  "/settings": FULL_ACCESS,
};

export function canAccessSection(role: string | undefined, href: string): boolean {
  const allowed = SECTION_ROLES[href];
  if (!allowed) return FULL_ACCESS.includes(role as Role); // مسار غير مصنَّف: افتراضيًا للإدارة العليا فقط
  return allowed.includes(role as Role);
}
