import type { APIRequestContext } from "@playwright/test";
import { API_BASE_URL, apiRegister, runSql } from "./api";

export const ADMIN_EMAIL = "admin@alemedu.com";
export const ADMIN_PASSWORD = "Admin@12345";

/**
 * يسجّل طالبًا جديدًا عبر الـAPI ثم يرفعه إلى دور فرعي إداري مباشرة في قاعدة
 * بيانات التطوير — لا واجهة مستخدم لإنشاء content_editor/content_reviewer/
 * support، فهذه أسرع طريقة موثوقة للحصول على حساب بدور محدد لاختبار RBAC.
 */
export async function createUserWithRole(request: APIRequestContext, role: string) {
  const user = await apiRegister(request, role);
  runSql(`
    DELETE FROM user_roles WHERE user_id = (SELECT id FROM users WHERE email = '${user.email}');
    INSERT INTO user_roles (user_id, role_id)
    SELECT (SELECT id FROM users WHERE email = '${user.email}'), id FROM roles WHERE name = '${role}';
  `);

  // أعد تسجيل الدخول لضمان توكن يحمل الدور الجديد (توكن التسجيل الأول يحمل student)
  const res = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { email: user.email, password: user.password },
  });
  const body = await res.json();
  return { ...user, accessToken: body.accessToken as string, role };
}
