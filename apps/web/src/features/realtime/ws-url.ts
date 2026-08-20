import { getApiBaseUrl } from "@/lib/api"

/** Build `ws(s)://…/ws?token=` from `VITE_API_URL`. */
export function getRealtimeWsUrl(accessToken: string) {
  const apiUrl = new URL(getApiBaseUrl())
  apiUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:"
  apiUrl.pathname = `${apiUrl.pathname.replace(/\/$/, "")}/ws`
  apiUrl.search = `token=${encodeURIComponent(accessToken)}`
  return apiUrl.toString()
}
