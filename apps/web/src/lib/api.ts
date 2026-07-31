import { ApiClient, type AuthResponse, type User } from "@alemedu/api-client";

// رمز الوصول يعيش في الذاكرة فقط (متغيّر وحدة) — لا localStorage ولا كوكي
// عادية. أي XSS في التطبيق لا يستطيع سرقته من تخزين دائم، وأقصى ضرر محتمل
// محصور بعمر الصفحة الحالية فقط. رمز التحديث لا يصل إلى جافاسكربت إطلاقًا:
// يعيش في كوكي HttpOnly يضبطها الخادم مباشرة (راجع services/api/internal/handlers/session_cookie.go).
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

function setAccessToken(token: string | null) {
  accessToken = token;
}

/** يُستدعى بعد login/register/changePassword الناجحة لتخزين رمز الوصول الجديد. */
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

/**
 * يُستدعى مرة عند تحميل أي صفحة محمية (رمز الوصول في الذاكرة يُفقَد عند أي
 * إعادة تحميل): يحاول استعادة الجلسة من كوكي رمز التحديث دون أي تفاعل من
 * المستخدم. يعيد المستخدم إن نجحت الاستعادة، أو null إن لم تكن هناك جلسة.
 */
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
