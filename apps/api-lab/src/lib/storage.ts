const ACCESS = "bi_lab_access";
const REFRESH = "bi_lab_refresh";
const API_KEY = "bi_lab_api_key";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH);
}

export function getStoredApiKey(): string | null {
  return localStorage.getItem(API_KEY);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS, access);
  localStorage.setItem(REFRESH, refresh);
}

export function setStoredApiKey(key: string | null) {
  if (key) localStorage.setItem(API_KEY, key);
  else localStorage.removeItem(API_KEY);
}

export function clearAuth() {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
}
