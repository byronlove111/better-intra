import { apiRequest } from "@/lib/api"

export type AgendaSource = "intra" | "betterintra"

export type AgendaCreator = {
  id: number
  login: string | null
  display_name: string | null
  avatar_url: string | null
  is_intra_linked: boolean
}

export type AgendaEvent = {
  id: string
  source: AgendaSource
  external_id: string
  title: string
  description: string | null
  location: string | null
  begin_at: string | null
  end_at: string | null
  url: string | null
  kind: string | null
  creator_id: number | null
  creator: AgendaCreator | null
  can_edit: boolean
}

export type AgendaResponse = {
  items: AgendaEvent[]
  sources_included: AgendaSource[]
  meta: {
    limit: number
    offset: number
    total_matched: number
    returned: number
    begin_at: string | null
    end_at: string | null
  }
}

export type BetterIntraEvent = {
  id: number
  creator_id: number
  title: string
  description: string | null
  location: string | null
  url: string | null
  begin_at: string
  end_at: string
  created_at: string
  updated_at: string
}

export type EventWritePayload = {
  title: string
  description?: string | null
  location?: string | null
  url?: string | null
  begin_at: string
  end_at: string
}

export type ListAgendaParams = {
  q?: string
  sources?: AgendaSource[]
  begin_at?: string
  end_at?: string
  limit?: number
  offset?: number
}

export const agendaQueryKey = ["agenda", "events"] as const

export function agendaListQueryKey(params: ListAgendaParams) {
  return [...agendaQueryKey, params] as const
}

function buildAgendaSearchParams(params: ListAgendaParams) {
  const search = new URLSearchParams()
  search.set("limit", String(params.limit ?? 100))
  search.set("offset", String(params.offset ?? 0))

  if (params.q?.trim()) {
    search.set("q", params.q.trim())
  }
  if (params.begin_at) {
    search.set("begin_at", params.begin_at)
  }
  if (params.end_at) {
    search.set("end_at", params.end_at)
  }
  for (const source of params.sources ?? []) {
    search.append("sources", source)
  }

  return search
}

export async function listAgenda(params: ListAgendaParams = {}) {
  const search = buildAgendaSearchParams(params)
  return apiRequest<AgendaResponse>(`/events?${search.toString()}`)
}

export async function createEvent(payload: EventWritePayload) {
  return apiRequest<BetterIntraEvent>("/events", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateEvent(
  eventId: number,
  payload: Partial<EventWritePayload>,
) {
  return apiRequest<BetterIntraEvent>(`/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function deleteEvent(eventId: number) {
  await apiRequest<void>(`/events/${eventId}`, {
    method: "DELETE",
  })
}

/** `datetime-local` value from an ISO string (browser local tz). */
export function toDatetimeLocalValue(iso: string | null | undefined) {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""

  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** ISO UTC from a `datetime-local` value. */
export function fromDatetimeLocalValue(value: string) {
  return new Date(value).toISOString()
}

export function localDateKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Local calendar day of an event begin (browser tz). */
export function eventLocalDateKey(iso: string | null | undefined) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return localDateKey(date)
}

export function defaultEventFormTimes(day?: Date) {
  const begin = day ? new Date(day) : new Date()
  if (day) {
    begin.setHours(10, 0, 0, 0)
  } else {
    begin.setMinutes(0, 0, 0)
    begin.setHours(begin.getHours() + 1)
  }

  const end = new Date(begin)
  end.setHours(end.getHours() + 2)

  return {
    begin_at: toDatetimeLocalValue(begin.toISOString()),
    end_at: toDatetimeLocalValue(end.toISOString()),
  }
}
