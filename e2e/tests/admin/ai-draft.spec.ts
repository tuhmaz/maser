import { test, expect } from "@playwright/test";
import { createUserWithRole } from "../support/admin";

// يتحقق أن زر "توليد بالذكاء الاصطناعي" (docs/ai-curriculum-roadmap.md — E05)
// يظهر فقط لمن يملك صلاحية ai_content.generate فعليًا (content_editor)، ولا
// يظهر لـcontent_reviewer رغم وصوله لنفس صفحة بنك الأسئلة. لا يستدعي هذا
// الاختبار Together AI فعليًا (لا يضغط "توليد") — يبقى صالحًا للتشغيل في CI
// بلا حاجة لمفتاح API حقيقي أو تكلفة استدعاء خارجي؛ التحقق الحي الكامل من
// التوليد الفعلي يتم يدويًا عند توفر مفتاح.

test("content_editor يرى زر توليد الذكاء الاصطناعي في بنك الأسئلة", async ({ page, request }) => {
  const editor = await createUserWithRole(request, "content_editor");

  await page.goto("/login");
  await page.locator("#admin-email").fill(editor.email);
  await page.locator("#admin-password").fill(editor.password);
  await page.getByRole("button", { name: "دخول لوحة الإدارة" }).click();
  await expect(page).toHaveURL("/", { timeout: 15_000 });

  await page.goto("/questions");
  await expect(page.getByRole("button", { name: "توليد بالذكاء الاصطناعي" })).toBeVisible();
});

test("content_reviewer لا يرى زر توليد الذكاء الاصطناعي رغم دخوله بنك الأسئلة", async ({ page, request }) => {
  const reviewer = await createUserWithRole(request, "content_reviewer");

  await page.goto("/login");
  await page.locator("#admin-email").fill(reviewer.email);
  await page.locator("#admin-password").fill(reviewer.password);
  await page.getByRole("button", { name: "دخول لوحة الإدارة" }).click();
  await expect(page).toHaveURL("/", { timeout: 15_000 });

  await page.goto("/questions");
  await expect(page.getByRole("link", { name: "بنك الأسئلة" })).toBeVisible();
  await expect(page.getByRole("button", { name: "توليد بالذكاء الاصطناعي" })).toHaveCount(0);

  // وحتى لو استدعى المسار مباشرة عبر الخادم، صلاحية ai_content.generate غير ممنوحة له
  const res = await request.post("http://localhost:8080/admin/questions/ai-draft", {
    headers: { Authorization: `Bearer ${reviewer.accessToken}` },
    data: {},
  });
  expect(res.status()).toBe(403);
});
