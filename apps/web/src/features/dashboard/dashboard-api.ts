import { apiRequest } from "@/lib/api"

export type AgendaEvent = {
  id: string
  title: string
  location: string | null
  begin_at: string | null
  source: "intra" | "betterintra"
}

type AgendaResponse = {
  items: AgendaEvent[]
}

export type Notification = {
  id: number
  type: "dm" | "follow" | "event" | "announcement"
  body: string
  url: string
  created_at: string
}

type NotificationsResponse = {
  items: Notification[]
}

export async function getNotifications() {
  const response = await apiRequest<NotificationsResponse>(
    "/notifications?limit=5",
  )

  return response.items
}

export type IntraEvaluation = {
  id: number
  role: "corrector" | "corrected"
  begin_at: string | null
  project_name: string | null
}

type EvaluationsResponse = {
  items: IntraEvaluation[]
}

export type OnlineFriend = {
  id: number
  login: string
  display_name: string | null
  avatar_url: string | null
  is_online: boolean
}

type PresenceResponse = {
  online: OnlineFriend[]
}

export type LogtimeDay = {
  date: string
  duration_hours: number
}

export type LogtimeResponse = {
  total_hours: number
  active_days: number
  days: LogtimeDay[]
}

export async function getDashboardEvents() {
  const response = await apiRequest<AgendaResponse>("/events?limit=5")
  return response.items
}

export async function getDashboardEvaluations() {
  const response = await apiRequest<EvaluationsResponse>(
    "/me/intra/evaluations?page_size=30",
  )

  return response.items
    .filter((evaluation) =>
      evaluation.begin_at
        ? new Date(evaluation.begin_at).getTime() >= Date.now()
        : false,
    )
    .sort((first, second) =>
      new Date(first.begin_at!).getTime() - new Date(second.begin_at!).getTime(),
    )
    .slice(0, 5)
}

export async function getDashboardOnlineFriends() {
  const response = await apiRequest<PresenceResponse>("/presence")
  return response.online
}

export function getDashboardLogtime(beginAt: string, endAt: string) {
  const logtimeQuery = new URLSearchParams({
    begin_at: beginAt,
    end_at: endAt,
  })

  return apiRequest<LogtimeResponse>(`/analytics/logtime?${logtimeQuery}`)
}
