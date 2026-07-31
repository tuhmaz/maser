import { test, expect, type Page } from "@playwright/test";
import { uniqueEmail } from "../support/api";

// يغطي المسار الذهبي الكامل للطالب من التسجيل حتى النتيجة — بالضبط التسلسل
// الذي تحقّقنا منه يدويًا عبر curl طوال هذه الجلسة، لكن مُؤتمَتًا الآن عبر
// متصفح حقيقي حتى يُكتشف أي كسر مستقبلي تلقائيًا.

async function answerCurrentQuestion(page: Page) {
  // نوع السؤال يُستكشف من عناصر النموذج الظاهرة فعليًا، لا من نص عربي هش.
  const radios = page.locator('input[type="radio"]');
  const checkboxes = page.locator('input[type="checkbox"]');
  const numberInput = page.locator('input[type="number"]');
  const orderingList = page.locator("ol li");

  if ((await radios.count()) > 0) {
    await radios.first().check();
  } else if ((await checkboxes.count()) > 0) {
    await checkboxes.first().check();
  } else if ((await numberInput.count()) > 0) {
    await numberInput.first().fill("5");
    await numberInput.first().blur();
  } else if ((await orderingList.count()) > 0) {
    // الترتيب الابتدائي مقبول كإجابة صالحة (لا يشترط الاختبار صحتها، فقط قابليتها للحفظ)
    await page.getByRole("button", { name: "تحريك لأسفل" }).first().click();
  } else {
    throw new Error("نوع سؤال غير معروف — لا عنصر إدخال ظاهر");
  }

  // ننتظر ظهور "محفوظة" فعليًا (وليس تأخيرًا ثابتًا) قبل الانتقال — الحفظ شبكي.
  await expect(page.getByText("محفوظة")).toBeVisible({ timeout: 10_000 });
}

test("مسار الطالب الذهبي: تسجيل → تهيئة → اختبار تشخيصي → نتيجة", async ({ page }) => {
  const email = uniqueEmail("golden");
  const password = "TestPass123!";

  // 1) التسجيل عبر الواجهة فعليًا (يتحقق من الكوكي HttpOnly ضمنيًا لأن الصفحة
  // التالية محمية ولن تفتح دون جلسة صالحة).
  await page.goto("/register");
  await page.getByLabel("الاسم").fill("طالب الاختبار الآلي");
  await page.locator("#register-email").fill(email);
  await page.locator("#register-password").fill(password);
  await page.getByRole("button", { name: /إنشاء الحساب/ }).click();

  await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });

  // 2) التهيئة: اختيار أول صف ومادة متاحين. كل ChoiceSection يرسم <section> خاصًا
  // به، لكنه متداخل داخل <section className="surface"> خارجية تحوي العنوانين
  // معًا — لذا فلترة page.locator("section") بالنص وحدها تطابق الخارجية أيضًا
  // وتُرجع أول زر "صف" حتى عند البحث عن زر "مادة". الحل: أقرب <section> فعليًا
  // بالصعود من العنوان (heading) نفسه عبر ancestor::section[1].
  const gradeSection = page.getByRole("heading", { name: "ما صفك؟" }).locator("xpath=ancestor::section[1]");
  await expect(gradeSection.locator("button").first()).toBeVisible({ timeout: 10_000 });

  const subjectsResponse = page.waitForResponse((res) => res.url().includes("/subjects") && res.request().method() === "GET");
  await gradeSection.locator("button").first().click();
  await subjectsResponse;

  const subjectSection = page.getByRole("heading", { name: "ما المادة؟" }).locator("xpath=ancestor::section[1]");
  const firstSubjectButton = subjectSection.locator("button").first();
  await expect(firstSubjectButton).toBeVisible({ timeout: 10_000 });
  await firstSubjectButton.click();

  const continueButton = page.getByRole("button", { name: /متابعة إلى تحديد المستوى/ });
  await expect(continueButton).toBeEnabled({ timeout: 10_000 });
  await continueButton.click();

  // 3) الاختبار التشخيصي: يجيب سؤالًا سؤالًا حتى الوصول لزر "إنهاء الاختبار"
  await expect(page).toHaveURL(/\/quizzes\//, { timeout: 15_000 });
  const finishButton = page.getByRole("button", { name: "إنهاء الاختبار" });
  const nextButton = page.getByRole("button", { name: "التالي" });

  for (let i = 0; i < 15; i++) {
    await answerCurrentQuestion(page);
    if (await finishButton.isVisible()) {
      await finishButton.click();
      break;
    }
    await nextButton.click();
  }

  // 4) النتيجة: تصحيح داخل الخادم بالكامل — الصفحة تعرض ما أعاده /attempts/{id}/result فقط
  await expect(page).toHaveURL(/\/results\//, { timeout: 15_000 });
  await expect(page.getByText(/%/)).toBeVisible({ timeout: 10_000 });
});
