import { test, expect } from "@playwright/test";
import { API_BASE_URL, apiCompleteOnboarding, apiRegister, forceMistakesDueNow } from "../support/api";

// يتحقق أن مراجعة الأخطاء تُصحَّح داخل الخادم فعليًا: نولّد خطأ حقيقيًا عبر
// تسليم اختبار تشخيصي دون إجابة أي سؤال (كلها خاطئة → تدخل دفتر الأخطاء)،
// ثم نراجع أحدها عبر الواجهة ونتحقق أن اختيار إجابة صحيحة يُظهر "صحيحة"
// (وليس مجرد نقر زر "نعم فهمتها" ذاتي التقييم كما كان سابقًا).

test("مراجعة الأخطاء: الخادم يصحّح الإجابة الفعلية وليس تقييمًا ذاتيًا", async ({ page, request }) => {
  const user = await apiRegister(request, "mistake");
  await apiCompleteOnboarding(request, user.accessToken);

  const startRes = await request.post(`${API_BASE_URL}/diagnostic/start`, {
    headers: { Authorization: `Bearer ${user.accessToken}` },
  });
  if (!startRes.ok()) {
    throw new Error(`فشل /diagnostic/start: ${startRes.status()} ${await startRes.text()}`);
  }
  const attempt = await startRes.json();

  // تسليم فوري دون أي إجابة — كل الأسئلة تُحتسَب خاطئة وتُسجَّل كأخطاء (راجع
  // الإصلاح الذي جعل الأسئلة غير المُجابة تدخل دفتر الأخطاء صراحة).
  const submitRes = await request.post(`${API_BASE_URL}/attempts/${attempt.attempt.id}/submit`, {
    headers: { Authorization: `Bearer ${user.accessToken}` },
  });
  if (!submitRes.ok()) {
    throw new Error(`فشل /attempts/${attempt.attempt.id}/submit: ${submitRes.status()} ${await submitRes.text()}`);
  }

  // أول خطأ يُجدوَل افتراضيًا بعد 24 ساعة — نقدّم الموعد للآن حتى تظهر شاشة المراجعة
  forceMistakesDueNow(user.email);

  // تسجيل الدخول عبر الواجهة فعليًا لأن الجلسة كوكي-محورة الآن
  await page.goto("/login");
  await page.locator("#email").fill(user.email);
  await page.locator("#password").fill(user.password);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page).toHaveURL(/\/(onboarding|dashboard)/, { timeout: 15_000 });

  await page.goto("/review");
  const firstCard = page.locator("article").first();
  await expect(firstCard).toBeVisible({ timeout: 10_000 });

  // اختر أي خيار متاح (قد يكون صحيحًا أو خاطئًا — المهم أن الخادم يقرر لا الطالب).
  // إن كان أول عنصر بنوع غير مدعوم تفاعليًا (ordering/matching)، جرّب التالي.
  let answered = false;
  const cards = page.locator("article");
  const cardCount = await cards.count();
  let card = firstCard;
  for (let i = 0; i < cardCount; i++) {
    card = cards.nth(i);
    const radio = card.locator('input[type="radio"]').first();
    const checkbox = card.locator('input[type="checkbox"]').first();
    const numberInput = card.locator('input[type="number"]').first();
    if (await radio.count() > 0) {
      await radio.check();
      answered = true;
    } else if (await checkbox.count() > 0) {
      await checkbox.check();
      answered = true;
    } else if (await numberInput.count() > 0) {
      await numberInput.fill("1");
      answered = true;
    }
    if (answered) break;
  }
  if (!answered) {
    test.skip(true, "لا يوجد سؤال بنوع مدعوم للمراجعة التفاعلية ضمن الأخطاء المتاحة");
  }

  await card.getByRole("button", { name: "تحقق من إجابتي" }).click();

  // النتيجة تظهر كنص "صحيحة" أو "غير صحيحة" — كلاهما دليل أن التصحيح تم فعليًا
  // من الخادم (وليس بضغطة "نعم فهمتها" كما كان سابقًا).
  await expect(card.getByText(/إجابة صحيحة|ليست صحيحة/)).toBeVisible({ timeout: 10_000 });
});
