import { apiDownload, apiRequest, apiUpload } from "@/lib/api"

type ProfileCursus = {
  id?: number | null
  name: string | null
  slug?: string | null
  grade: string | null
  level: number | null
  end_at: string | null
  blackholed_at: string | null
}

type ProfileCampus = {
  name: string | null
}

type ProfileIntra = {
  login: string
  location: string | null
  wallet: number | null
  correction_point: number | null
  campus: ProfileCampus[]
  cursus: ProfileCursus[]
}

export type UserProfile = {
  id?: number | null
  login: string | null
  display_name: string | null
  avatar_url: string | null
  banner_url?: string | null
  has_custom_avatar?: boolean
  email: string | null
  bio: string | null
  is_betterintra_linked: boolean
  is_intra_linked: boolean
  is_online?: boolean | null
  intra: ProfileIntra | null
  updated_at?: string | null
}

export type FriendStats = {
  following_count: number
  followers_count: number
  is_following?: boolean | null
}

export type ProfileLogtime = {
  total_hours: number
  active_days: number
  days: { date: string; duration_hours: number }[]
}

export type ProfileProject = {
  id: number
  status: string | null
  final_mark: number | null
  validated: boolean | null
  marked_at: string | null
  project_name: string | null
  updated_at: string | null
  cursus_ids?: number[]
}

type ProjectsResponse = {
  items: ProfileProject[]
  meta: {
    page: number
    page_size: number
    total: number | null
  }
}

type MyLogtimeResponse = ProfileLogtime

type UserLogtimeResponse = {
  total_seconds: number
  days: { date: string; duration_seconds: number }[]
}

export function getMyProfile() {
  return apiRequest<UserProfile>("/users/me")
}

export function getUserProfile(login: string) {
  return apiRequest<UserProfile>(`/users/${encodeURIComponent(login)}`)
}

export function updateMyBio(bio: string) {
  return apiRequest<UserProfile>("/users/me", {
    method: "PATCH",
    body: JSON.stringify({ bio }),
  })
}

export function uploadMyAvatar(file: File) {
  const formData = new FormData()
  formData.append("file", file)
  return apiUpload<UserProfile>("/users/me/avatar", formData)
}

export function deleteMyAvatar() {
  return apiRequest<UserProfile>("/users/me/avatar", {
    method: "DELETE",
  })
}

export function uploadMyBanner(file: File) {
  const formData = new FormData()
  formData.append("file", file)
  return apiUpload<UserProfile>("/users/me/banner", formData)
}

export function deleteMyBanner() {
  return apiRequest<UserProfile>("/users/me/banner", {
    method: "DELETE",
  })
}

export type GdprErasureResult = {
  deleted: boolean
  api_keys: number
  events: number
  notifications: number
  friendships: number
  blocks: number
  messages: number
  conversation_reads: number
  conversations: number
  user: number
}

/** Irreversible GDPR erasure of the current BetterIntra account. */
export function deleteMyAccount() {
  return apiRequest<GdprErasureResult>("/users/me", {
    method: "DELETE",
  })
}

export function getMyFriendStats() {
  return apiRequest<FriendStats>("/friends/stats")
}

export function getUserFriendStats(login: string) {
  return apiRequest<FriendStats>(
    `/friends/${encodeURIComponent(login)}/stats`,
  )
}

export async function getProfileProjects(login: string | undefined) {
  const pageSize = 100
  const items: ProfileProject[] = []
  let page = 1

  while (page <= 20) {
    const query = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    })
    const path = login
      ? `/intra/users/${encodeURIComponent(login)}/projects?${query}`
      : `/me/intra/projects?${query}`
    const response = await apiRequest<ProjectsResponse>(path)
    items.push(...response.items)

    if (response.items.length < pageSize) break
    if (response.meta.total != null && items.length >= response.meta.total) break
    page += 1
  }

  return items.sort((first, second) =>
    (first.project_name ?? "").localeCompare(second.project_name ?? "", "fr", {
      sensitivity: "base",
    }),
  )
}

export async function getMyProjectsPage(page: number, pageSize: number) {
  return apiRequest<ProjectsResponse>(
    `/me/intra/projects?page=${page}&page_size=${pageSize}`,
  )
}

export async function getProfileLogtime(
  login: string | undefined,
  beginAt: string,
  endAt: string,
) {
  const query = new URLSearchParams({ begin_at: beginAt, end_at: endAt })

  if (!login) {
    return apiRequest<MyLogtimeResponse>(`/analytics/logtime?${query}`)
  }

  const response = await apiRequest<UserLogtimeResponse>(
    `/intra/users/${encodeURIComponent(login)}/logtime?${query}`,
  )

  return {
    total_hours: Math.round((response.total_seconds / 3600) * 100) / 100,
    active_days: response.days.filter((day) => day.duration_seconds > 0).length,
    days: response.days.map((day) => ({
      date: day.date,
      duration_hours: Math.round((day.duration_seconds / 3600) * 100) / 100,
    })),
  }
}

export type LogtimeExportFormat = "csv" | "pdf"

export function exportMyLogtime(
  format: LogtimeExportFormat,
  beginAt: string,
  endAt: string,
) {
  const query = new URLSearchParams({ begin_at: beginAt, end_at: endAt })
  const extension = format === "csv" ? "csv" : "pdf"
  return apiDownload(`/analytics/logtime/export.${extension}?${query}`, {
    filename: `logtime.${extension}`,
  })
}
