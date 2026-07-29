import type {
  ApiErrorBody,
  AuthResponse,
  Grade,
  Lesson,
  Subject,
  Unit,
  User,
} from "./types";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => string | null | undefined;
}

/**
 * عميل بسيط لخدمة Alemedu API. يطابق المسارات الموثّقة في
 * contracts/openapi/openapi.yaml و docs/api-contract.md.
 *
 * القاعدة الذهبية (docs/security-requirements.md): هذا العميل لا يحسب أي نتيجة
 * أو صلاحية محليًا؛ كل قرار يُتخذ من استجابة الخادم فقط.
 */
export class ApiClient {
  private baseUrl: string;
  private getAccessToken?: () => string | null | undefined;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.getAccessToken = options.getAccessToken;
  }

  private async request<T>(
    path: string,
    init?: RequestInit
  ): Promise<T> {
    const token = this.getAccessToken?.();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    if (res.status === 204) return undefined as T;

    const body = await res.json().catch(() => undefined);

    if (!res.ok) {
      const err = body as ApiErrorBody | undefined;
      throw new ApiError(
        res.status,
        err?.error?.code ?? "unknown_error",
        err?.error?.message ?? "حدث خطأ غير متوقع"
      );
    }

    return body as T;
  }

  // --- المصادقة ---
  register(input: { email: string; password: string; displayName: string }) {
    return this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  login(input: { email: string; password: string }) {
    return this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  refresh(refreshToken: string) {
    return this.request<AuthResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  }

  logout(refreshToken: string) {
    return this.request<void>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  }

  me() {
    return this.request<User>("/auth/me");
  }

  // --- التهيئة ---
  completeOnboarding(input: { gradeId: string; subjectIds: string[] }) {
    return this.request<void>("/onboarding/complete", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  // --- المنهاج ---
  listGrades() {
    return this.request<Grade[]>("/grades");
  }

  listSubjectsForGrade(gradeId: string) {
    return this.request<Subject[]>(`/grades/${gradeId}/subjects`);
  }

  getSubject(subjectId: string) {
    return this.request<Subject>(`/subjects/${subjectId}`);
  }

  listUnits(subjectId: string) {
    return this.request<Unit[]>(`/subjects/${subjectId}/units`);
  }

  listLessons(unitId: string) {
    return this.request<Lesson[]>(`/units/${unitId}/lessons`);
  }

  getLesson(lessonId: string) {
    return this.request<Lesson>(`/lessons/${lessonId}`);
  }
}
