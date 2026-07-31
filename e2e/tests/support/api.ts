import { execSync } from "node:child_process";
import type { APIRequestContext } from "@playwright/test";

export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";

/**
 * ينفّذ SQL على قاعدة بيانات الاختبار — يُفضّل psql مباشرة (يعمل في CI حيث
 * DATABASE_URL يشير لخدمة postgres حقيقية)، ويسقط احتياطيًا إلى
 * `docker exec` على حاوية docker-compose المحلية إن كان psql غير مثبَّت على
 * جهاز التطوير نفسه (حال هذا المستودع محليًا على Windows).
 */
export function runSql(sql: string) {
  const oneLine = sql.replace(/\s+/g, " ").trim();
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    execSync(`psql "${databaseUrl}" -v ON_ERROR_STOP=1 -c "${oneLine}"`, { stdio: "pipe" });
    return;
  }
  execSync(`docker exec maser-postgres-1 psql -U alemedu -d alemedu_dev -c "${oneLine}"`, { stdio: "pipe" });
}

/** بريد فريد لكل تشغيل اختبار — يمنع تصادم unique(email) بين عمليات التشغيل. */
export function uniqueEmail(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}@e2e.test`;
}

export interface RegisteredUser {
  email: string;
  password: string;
  accessToken: string;
}

/**
 * يسجّل مستخدمًا جديدًا مباشرة عبر الـAPI (أسرع وأثبت من قيادة نموذج التسجيل
 * لكل اختبار يحتاج مستخدمًا مُسجَّلًا مسبقًا فقط). اختبارات التسجيل نفسها تبقى
 * مدفوعة بالواجهة في web/auth.spec.ts.
 */
export async function apiRegister(request: APIRequestContext, prefix = "student"): Promise<RegisteredUser> {
  const email = uniqueEmail(prefix);
  const password = "TestPass123!";

  // /auth/register محدود بـ20 طلبًا/دقيقة لكل IP (حماية حقيقية ومقصودة — راجع
  // services/api/internal/router/router.go). تشغيل حزمة E2E كاملة بسرعة قد
  // يصطدم بهذا الحد أحيانًا؛ الحل الصحيح هو الانتظار وإعادة المحاولة هنا، لا
  // تخفيف الحد نفسه من جهة الخادم.
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await request.post(`${API_BASE_URL}/auth/register`, {
      data: { email, password, displayName: "E2E Test User" },
    });
    if (res.ok()) {
      const body = await res.json();
      return { email, password, accessToken: body.accessToken };
    }
    if (res.status() === 429 && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 20_000));
      continue;
    }
    throw new Error(`فشل تسجيل مستخدم اختبار: ${res.status()} ${await res.text()}`);
  }
  throw new Error("فشل تسجيل مستخدم اختبار بعد إعادة المحاولة");
}

/** يُكمل تهيئة حساب طالب (صف/مادة) عبر أول صف ومادة متاحين فعليًا. */
export async function apiCompleteOnboarding(request: APIRequestContext, accessToken: string) {
  const grades = await (await request.get(`${API_BASE_URL}/grades`)).json();
  const grade = grades[0];
  const subjects = await (
    await request.get(`${API_BASE_URL}/grades/${grade.id}/subjects`)
  ).json();
  const subject = subjects[0];
  const res = await request.post(`${API_BASE_URL}/onboarding/complete`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { gradeId: grade.id, subjectIds: [subject.id] },
  });
  if (!res.ok()) {
    throw new Error(`فشل إكمال التهيئة: ${res.status()} ${await res.text()}`);
  }
  return { grade, subject };
}

/**
 * الأخطاء المُنشأة حديثًا مجدولة للمراجعة بعد 24 ساعة (أول خطأ) — لا طريقة
 * لاختبار شاشة "المراجعة الآن" (/review) دون قفز زمني. هذا الاستدعاء يُقدِّم
 * موعد كل جدولة معلَّقة لهذا الطالب إلى الآن مباشرة عبر قاعدة بيانات
 * التطوير المحلية (docker) — مقبول فقط في بيئة E2E المحلية، وليس أسلوب إنتاج.
 */
export function forceMistakesDueNow(userEmail: string) {
  runSql(`
    UPDATE review_schedules SET due_at = now()
    WHERE completed_at IS NULL AND mistake_id IN (
      SELECT sm.id FROM student_mistakes sm
      JOIN users u ON u.id = sm.user_id
      WHERE u.email = '${userEmail}'
    );
  `);
}
