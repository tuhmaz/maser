import { z } from "zod";

// مخططات تحقق مشتركة بين واجهة الطالب ولوحة الإدارة.
// هذه القواعد تعكس ما هو موثّق في docs/security-requirements.md،
// لكنها لا تُغني أبدًا عن التحقق الملزم داخل services/api (لا تثق بالواجهة الأمامية).

export const registerSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل"),
  displayName: z.string().min(2, "الاسم قصير جدًا"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const onboardingSchema = z.object({
  gradeId: z.string().uuid(),
  subjectIds: z.array(z.string().uuid()).min(1, "اختر مادة واحدة على الأقل"),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;
