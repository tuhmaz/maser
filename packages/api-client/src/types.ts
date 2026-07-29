// أنواع مطابقة لمخططات contracts/openapi/openapi.yaml
// (نسخة يدوية مؤقتة؛ يمكن استبدالها لاحقًا بتوليد آلي من العقد عبر openapi-typescript)

export type Role =
  | "student"
  | "parent"
  | "content_editor"
  | "content_reviewer"
  | "support"
  | "admin"
  | "super_admin";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  onboardingCompleted: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Grade {
  id: string;
  name: string;
  level: number;
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
}

export interface Unit {
  id: string;
  name: string;
  order: number;
}

export interface Lesson {
  id: string;
  name: string;
  summary?: string;
  order: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
