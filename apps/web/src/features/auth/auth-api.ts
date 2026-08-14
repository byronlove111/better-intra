import { apiRequest } from "@/lib/api"

type CredentialsInput = {
  email: string
  password: string
}

export type AuthUser = {
  id: number
  email: string
  forty_two_id: number | null
  login: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
  is_intra_linked: boolean
}

export type AuthResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  user: AuthUser
}

type FortyTwoAuthorizeResponse = {
  authorize_url: string
}

export function login(input: CredentialsInput) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
    requiresAuth: false,
  })
}

export function register(input: CredentialsInput) {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
    requiresAuth: false,
  })
}

export function getCurrentUser() {
  return apiRequest<AuthUser>("/auth/me")
}

export function startFortyTwoLink() {
  return apiRequest<FortyTwoAuthorizeResponse>("/auth/42")
}
