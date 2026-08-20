import { apiRequest } from "@/lib/api"

export type Friend = {
  forty_two_id: number
  login: string
  display_name: string | null
  avatar_url: string | null
  followed_at: string
  is_betterintra_linked: boolean
  betterintra_user_id: number | null
  bio: string | null
  is_online: boolean | null
}

export type FriendList = {
  items: Friend[]
  count: number
}

export type FriendStats = {
  login: string
  forty_two_id: number
  following_count: number
  followers_count: number
  is_following: boolean | null
  is_betterintra_linked: boolean
}

export function getMyFollowing() {
  return apiRequest<FriendList>("/friends/following")
}

export function getMyFollowers() {
  return apiRequest<FriendList>("/friends/followers")
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
  return apiRequest<Friend>(`/friends/${encodeURIComponent(login)}`, {
    method: "POST",
  })
}

export function unfollowUser(login: string) {
  return apiRequest<void>(`/friends/${encodeURIComponent(login)}`, {
    method: "DELETE",
  })
}
