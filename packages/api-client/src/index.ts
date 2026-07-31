export * from "./types";
export * from "./client";
// أنواع مولَّدة آليًا من contracts/openapi/openapi.yaml (npm run generate).
// تُصدَّر تحت اسم مساحة `Schema` لتفادي أي تعارض مع الأنواع اليدوية أعلاه —
// التبني تدريجي، لا تُستبدَل types.ts دفعة واحدة. CI يتحقق أنها متطابقة مع
// العقد دائمًا (راجع .github/workflows/ci.yml: openapi-client).
export type { paths as ApiPaths, components as ApiComponents } from "./generated/schema";
