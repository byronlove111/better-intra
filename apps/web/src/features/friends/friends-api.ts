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

export type FriendsList = {
  items: Friend[]
  count: number
}

export function getFollowing() {
  return apiRequest<FriendsList>("/friends/following")
}

export function getFollowers() {
  return apiRequest<FriendsList>("/friends/followers")
}

