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
  final_mark: number | null
  comment: string | null
  project_name: string | null
  corrector_login: string | null
  corrected_logins: string[]
  // Ces champs seront affichés si le backend expose le feedback sur l'évaluateur.
  feedback_rating?: number | null
  feedback_comment?: string | null
}

type EvaluationsResponse = {
  items: IntraEvaluation[]
  meta: {
    page: number
    page_size: number
    total: number | null
  }
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
  const response = await getEvaluationsPage(1, 30)

  return response.items
    .filter((evaluation) => {
      if (!evaluation.begin_at) return false

      const isUpcoming =
        new Date(evaluation.begin_at).getTime() >= Date.now()

      return isUpcoming || isCorrectionToFinalize(evaluation)
    })
    .sort((first, second) =>
      new Date(first.begin_at!).getTime() - new Date(second.begin_at!).getTime(),
    )
    .slice(0, 5)
}

export function isCorrectionToFinalize(evaluation: IntraEvaluation) {
  if (
    evaluation.role !== "corrector"
    || evaluation.comment?.trim()
    || !evaluation.begin_at
  ) {
    return false
  }

  return new Date(evaluation.begin_at).getTime() < Date.now()
}

export async function getEvaluationsPage(
  page: number,
  pageSize: number,
  role: "all" | "corrector" | "corrected" = "all",
) {
  return apiRequest<EvaluationsResponse>(
    `/me/intra/evaluations?role=${role}&page=${page}&page_size=${pageSize}`,
  )
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
