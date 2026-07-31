import { test, expect } from "@playwright/test";
import { API_BASE_URL, apiCompleteOnboarding, apiRegister } from "../support/api";

// يتحقق من ربط المهمة اليومية بمحاولة الاختبار: توليد خطة، فتح مهمة "أسئلة
// جديدة" من صفحة اليوم عبر الواجهة، وأن الصفحة تنتقل فعليًا لمحرك الاختبار
// (وليس فقط استجابة API ناجحة).

test("المهمة اليومية: فتح مهمة اختبار من /today ينتقل لمحرك الاختبار الفعلي", async ({ page, request }) => {
  const user = await apiRegister(request, "dailyplan");
  await apiCompleteOnboarding(request, user.accessToken);

  const genRes = await request.post(`${API_BASE_URL}/daily-plan/generate`, {
    headers: { Authorization: `Bearer ${user.accessToken}` },
  });
  expect(genRes.ok()).toBeTruthy();
  const plan = await genRes.json();
  const quizTask = plan.tasks.find((t: { type: string }) => t.type === "new_questions" || t.type === "stabilization_test");

  await page.goto("/login");
  await page.locator("#email").fill(user.email);
  await page.locator("#password").fill(user.password);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page).toHaveURL(/\/(onboarding|dashboard)/, { timeout: 15_000 });

  await page.goto("/today");

  if (!quizTask) {
    // خطة بلا مهمة اختبار (يمكن أن يحدث بحسب حالة الطالب) — تحقق فقط من ظهور الصفحة بلا خطأ
    await expect(page.locator("main")).toBeVisible();
    test.skip(true, "خطة اليوم المولَّدة لهذا الطالب الجديد لا تحوي مهمة اختبار (new_questions/stabilization_test)");
    return;
  }

  // التسمية المعروضة تعتمد على نوع المهمة (TASK_META في today/page.tsx)
  const taskLabel = quizTask.type === "new_questions" ? "تدريب موجه" : "تأكد من فهمك";
  const taskRow = page.locator("li").filter({ hasText: taskLabel }).first();
  const startButton = taskRow.getByRole("button", { name: "ابدأ" });
  await expect(startButton).toBeVisible({ timeout: 10_000 });
  await startButton.click();

  await expect(page).toHaveURL(/\/quizzes\//, { timeout: 15_000 });
  await expect(page.getByText("السؤال 1 من")).toBeVisible({ timeout: 10_000 });
});
