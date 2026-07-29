import { ApiClient, type AuthResponse } from "@alemedu/api-client";

const ACCESS_TOKEN_KEY = "alemedu_admin_access_token";
const REFRESH_TOKEN_KEY = "alemedu_admin_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(auth: Pick<AuthResponse, "accessToken" | "refreshToken">) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, auth.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, auth.refreshToken);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export const api = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
  getAccessToken,
  getRefreshToken,
  onTokensUpdated: setTokens,
  onAuthFailure: () => {
    clearTokens();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  },
});
