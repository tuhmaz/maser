import { ApiClient, type AuthResponse, type User } from "@alemedu/api-client";

// نفس نمط apps/web: رمز الوصول في الذاكرة فقط، رمز التحديث كوكي HttpOnly لا
// تراه جافاسكربت إطلاقًا (يضبطها الخادم مباشرة). راجع apps/web/src/lib/api.ts
// للشرح الكامل لسبب هذا التصميم.
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

function setAccessToken(token: string | null) {
  accessToken = token;
}

/** يُستدعى بعد login/changePassword الناجحة لتخزين رمز الوصول الجديد. */
export function applySession(auth: Pick<AuthResponse, "accessToken">) {
  setAccessToken(auth.accessToken);
}

export function clearSession() {
  setAccessToken(null);
}

export const api = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
  getAccessToken,
  onTokensUpdated: applySession,
  onAuthFailure: () => {
    clearSession();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  },
});

/** يستعيد الجلسة من كوكي رمز التحديث بعد إعادة تحميل الصفحة. */
export async function bootstrapSession(): Promise<User | null> {
  try {
    const auth = await api.refresh();
    setAccessToken(auth.accessToken);
    return auth.user;
  } catch {
    setAccessToken(null);
    return null;
  }
}
