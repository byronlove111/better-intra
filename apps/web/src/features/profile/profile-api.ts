import { apiRequest } from "@/lib/api"

type ProfileCursus = {
  name: string | null
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
  login: string | null
  display_name: string | null
  avatar_url: string | null
  email: string | null
  bio: string | null
  is_betterintra_linked: boolean
  is_intra_linked: boolean
  intra: ProfileIntra | null
}

export type FriendStats = {
  following_count: number
  followers_count: number
  is_following: boolean | null
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

export function getMyFriendStats() {
  return apiRequest<FriendStats>("/friends/stats")
}

export function getUserFriendStats(login: string) {
  return apiRequest<FriendStats>(
    `/friends/${encodeURIComponent(login)}/stats`,
  )
}

export function followUser(login: string) {
  return apiRequest(`/friends/${encodeURIComponent(login)}`, {
    method: "POST",
  })
}

export function unfollowUser(login: string) {
  return apiRequest<void>(`/friends/${encodeURIComponent(login)}`, {
    method: "DELETE",
  })
}

export async function getProfileProjects(login: string | undefined) {
  const path = login
    ? `/intra/users/${encodeURIComponent(login)}/projects?page_size=6`
    : "/me/intra/projects?page_size=6"
  const response = await apiRequest<ProjectsResponse>(path)

  return response.items
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
