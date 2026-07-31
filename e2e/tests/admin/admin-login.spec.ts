import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "../support/admin";

test("تسجيل دخول الإدارة يفتح لوحة التحكم فعليًا", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#admin-email").fill(ADMIN_EMAIL);
  await page.locator("#admin-password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "دخول لوحة الإدارة" }).click();

  await expect(page).toHaveURL("/", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "لوحة الإدارة" })).toBeVisible({ timeout: 10_000 });
});

test("جلسة الإدارة تبقى بعد إعادة تحميل الصفحة (كوكي HttpOnly)", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#admin-email").fill(ADMIN_EMAIL);
  await page.locator("#admin-password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "دخول لوحة الإدارة" }).click();
  await expect(page).toHaveURL("/", { timeout: 15_000 });

  await page.reload();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
});
