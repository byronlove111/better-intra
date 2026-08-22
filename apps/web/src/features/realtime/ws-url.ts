import { getApiBaseUrl } from "@/lib/api"

/** Build `ws(s)://…/ws?token=` from `VITE_API_URL` (absolute or relative `/api`). */
export function getRealtimeWsUrl(accessToken: string) {
  // Relative bases like `/api` are valid for `fetch()` but not for `new URL(base)` alone.
  const apiUrl = new URL(getApiBaseUrl(), window.location.origin)
  apiUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:"
  apiUrl.pathname = `${apiUrl.pathname.replace(/\/$/, "")}/ws`
  apiUrl.search = `token=${encodeURIComponent(accessToken)}`
  return apiUrl.toString()
}
