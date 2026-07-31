import { defineConfig, devices } from "@playwright/test";

// يشير للخوادم الثلاثة الشغّالة فعليًا محليًا (API/web/admin) — لا webServer
// تلقائي هنا لأن الخادم الحقيقي يحتاج Postgres مُهاجَرًا مسبقًا (docker-compose)،
// وليس شيئًا يبدأه Playwright بأمر واحد. راجع README.md لتشغيل البيئة أولًا.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false, // الاختبارات تشترك في نفس قاعدة البيانات الحية — لا تشغيل متوازٍ لتفادي تضارب الحالة
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "web",
      testMatch: /web\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: process.env.WEB_BASE_URL ?? "http://localhost:3000" },
    },
    {
      name: "admin",
      testMatch: /admin\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: process.env.ADMIN_BASE_URL ?? "http://localhost:3001" },
    },
  ],
});
