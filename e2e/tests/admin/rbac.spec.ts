import { test, expect } from "@playwright/test";
import { createUserWithRole } from "../support/admin";

// يتحقق أن الصلاحيات الدقيقة (middleware.RequirePermission) تنعكس فعليًا في
// الواجهة، لا فقط في الباك إند: content_editor يدخل لوحة الإدارة ويرى المحتوى
// لكن لا يرى قسم "الإعدادات" (settings.manage حصرًا لـ admin/super_admin)،
// ومحاولة فتحه مباشرة عبر الرابط تُرفَض من الخادم (403) لا من الواجهة فقط.

test("content_editor: يدخل لوحة الإدارة، لا يرى رابط الإعدادات، ويُرفَض من الخادم عند محاولة الوصول المباشر", async ({
  page,
  request,
}) => {
  const editor = await createUserWithRole(request, "content_editor");

  await page.goto("/login");
  await page.locator("#admin-email").fill(editor.email);
  await page.locator("#admin-password").fill(editor.password);
  await page.getByRole("button", { name: "دخول لوحة الإدارة" }).click();
  await expect(page).toHaveURL("/", { timeout: 15_000 });

  // القسم مخفي في الشريط الجانبي (canAccessSection في apps/admin/src/lib/roles.ts)
  await expect(page.getByRole("link", { name: "الإعدادات" })).toHaveCount(0);

  // حتى لو فتح الرابط مباشرة، يجب أن يُرفَض من الخادم لا أن يظهر محتوى حساس
  const settingsRes = await request.get("http://localhost:8080/admin/settings", {
    headers: { Authorization: `Bearer ${editor.accessToken}` },
  });
  expect(settingsRes.status()).toBe(403);

  // بالمقابل: يملك صلاحية قراءة/تحرير المحتوى فعليًا
  const questionsRes = await request.get("http://localhost:8080/admin/questions", {
    headers: { Authorization: `Bearer ${editor.accessToken}` },
  });
  expect(questionsRes.ok()).toBeTruthy();
});

test("support: يرى المستخدمين والتقارير، لا يرى بنك الأسئلة", async ({ page, request }) => {
  const support = await createUserWithRole(request, "support");

  await page.goto("/login");
  await page.locator("#admin-email").fill(support.email);
  await page.locator("#admin-password").fill(support.password);
  await page.getByRole("button", { name: "دخول لوحة الإدارة" }).click();
  await expect(page).toHaveURL("/", { timeout: 15_000 });

  await expect(page.getByRole("link", { name: "بنك الأسئلة" })).toHaveCount(0);

  const questionsRes = await request.get("http://localhost:8080/admin/questions", {
    headers: { Authorization: `Bearer ${support.accessToken}` },
  });
  expect(questionsRes.status()).toBe(403);

  const usersRes = await request.get("http://localhost:8080/admin/users", {
    headers: { Authorization: `Bearer ${support.accessToken}` },
  });
  expect(usersRes.ok()).toBeTruthy();
});
