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
  /** رمز التحديث المخزن — إن وُجد يجدَّد الوصول تلقائيًا عند انتهاء الجلسة. */
  getRefreshToken?: () => string | null | undefined;
  /** يُستدعى بعد نجاح التجديد لتخزين الرمزين الجديدين. */
  onTokensUpdated?: (auth: AuthResponse) => void;
  /** يُستدعى عند فشل التجديد نهائيًا (مثلًا: توجيه المستخدم لصفحة الدخول). */
  onAuthFailure?: () => void;
}

/**
 * عميل بسيط لخدمة Alemedu API. يطابق المسارات الموثّقة في
 * contracts/openapi/openapi.yaml و docs/api-contract.md.
 *
 * القاعدة الذهبية (docs/security-requirements.md): هذا العميل لا يحسب أي نتيجة
 * أو صلاحية محليًا؛ كل قرار يُتخذ من استجابة الخادم فقط.
 *
 * الجلسة: عند رد 401 على مسار محمي يحاول العميل تجديد الرمز مرة واحدة عبر
 * /auth/refresh ثم يعيد الطلب؛ إن فشل التجديد يستدعي onAuthFailure.
 */
export class ApiClient {
  private baseUrl: string;
  private getAccessToken?: () => string | null | undefined;
  private getRefreshToken?: () => string | null | undefined;
  private onTokensUpdated?: (auth: AuthResponse) => void;
  private onAuthFailure?: () => void;
  private refreshInFlight: Promise<boolean> | null = null;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.getAccessToken = options.getAccessToken;
    this.getRefreshToken = options.getRefreshToken;
    this.onTokensUpdated = options.onTokensUpdated;
    this.onAuthFailure = options.onAuthFailure;
  }

  private async rawRequest(path: string, init?: RequestInit): Promise<Response> {
    const token = this.getAccessToken?.();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${this.baseUrl}${path}`, { ...init, headers });
  }

  /** يجدّد الجلسة مرة واحدة مهما تزامنت الطلبات الفاشلة (single-flight). */
  private tryRefresh(): Promise<boolean> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = (async () => {
        const refreshToken = this.getRefreshToken?.();
        if (!refreshToken) return false;
        try {
          const res = await fetch(`${this.baseUrl}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });
          if (!res.ok) return false;
          const auth = (await res.json()) as AuthResponse;
          this.onTokensUpdated?.(auth);
          return true;
        } catch {
          return false;
        }
      })().finally(() => {
        this.refreshInFlight = null;
      });
    }
    return this.refreshInFlight;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let res = await this.rawRequest(path, init);

    // 401 على مسار محمي (غير مسارات المصادقة نفسها) → جدّد وأعد المحاولة مرة واحدة
    if (res.status === 401 && !path.startsWith("/auth/")) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        res = await this.rawRequest(path, init);
      } else {
        this.onAuthFailure?.();
      }
    }

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

  /** يغيّر كلمة المرور ويعيد رمزي جلسة جديدين (الجلسات القديمة تُلغى في الخادم). */
  changePassword(input: { currentPassword: string; newPassword: string }) {
    return this.request<AuthResponse>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(input),
    });
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
