import { apiRequest } from "@/lib/api"

export type ApiKey = {
  id: number
  name: string
  prefix: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

export type ApiKeyCreated = {
  id: number
  name: string
  prefix: string
  key: string
  created_at: string
}

export const apiKeysQueryKey = ["api-keys"] as const

export function listApiKeys() {
  return apiRequest<ApiKey[]>("/api-keys")
}

export function createApiKey(name: string) {
  return apiRequest<ApiKeyCreated>("/api-keys", {
    method: "POST",
    body: JSON.stringify({ name }),
  })
}

export function revokeApiKey(keyId: number) {
  return apiRequest<ApiKey>(`/api-keys/${keyId}`, {
    method: "DELETE",
  })
}
