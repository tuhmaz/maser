import { test, expect } from "@playwright/test";
import { apiRegister } from "../support/api";

// يتحقق من إصلاح جلسات الكوكي (HttpOnly refresh token): تسجيل الدخول، تأكيد
// بقاء الجلسة بعد إعادة تحميل كاملة للصفحة (رمز الوصول بالذاكرة يُفقَد عند
// إعادة التحميل ويجب أن يُستعاد تلقائيًا من الكوكي عبر bootstrapSession)،
// ثم تسجيل الخروج والتأكد أن الجلسة لا تُستعاد بعده.

test("الجلسة تبقى بعد إعادة تحميل الصفحة، وتُمحى فعليًا بعد تسجيل الخروج", async ({ page, request }) => {
  const user = await apiRegister(request, "session");

  await page.goto("/login");
  await page.locator("#email").fill(user.email);
  await page.locator("#password").fill(user.password);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();

  await expect(page).toHaveURL(/\/(onboarding|dashboard)/, { timeout: 15_000 });

  // انتقل لصفحة محمية صراحة، ثم أعد تحميل الصفحة بالكامل (يفقد رمز الوصول
  // في الذاكرة — الاختبار الحقيقي لكوكي HttpOnly + bootstrapSession).
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "تجربة تناسبك" })).toBeVisible({ timeout: 10_000 });

  await page.reload();
  await expect(page).toHaveURL(/\/settings/);
  await expect(page.getByRole("heading", { name: "تجربة تناسبك" })).toBeVisible({ timeout: 10_000 });
  await expect(page).not.toHaveURL(/\/login/);

  // تسجيل الخروج يمحو كوكي الخادم فعليًا — محاولة فتح صفحة محمية بعده تُوجَّه لتسجيل الدخول
  await page.getByRole("button", { name: "قائمة الحساب" }).click();
  await page.getByRole("banner").getByRole("button", { name: "تسجيل الخروج" }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
});
