// إعدادات مشتركة بين apps/web و apps/admin.
// راجع docs/deployment-plan.md لقيم النطاقات الفعلية لكل بيئة.

export const ENV = {
  local: {
    web: "http://localhost:3000",
    admin: "http://localhost:3001",
    api: "http://localhost:8080",
  },
  staging: {
    web: "https://staging.alemedu.com",
    admin: "https://staging-admin.alemedu.com",
    api: "https://staging-api.alemedu.com",
  },
  production: {
    web: "https://alemedu.com",
    admin: "https://admin.alemedu.com",
    api: "https://api.alemedu.com",
  },
} as const;

export type AppEnv = keyof typeof ENV;
