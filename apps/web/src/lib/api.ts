import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from "@/features/auth/auth-storage"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

type ApiErrorBody = {
  detail?: string
}

type RefreshResponse = {
  access_token: string
  refresh_token: string
}

type ApiRequestOptions = RequestInit & {
  requiresAuth?: boolean
  retryOnUnauthorized?: boolean
}

// Share one refresh request if several protected calls receive a 401 together.
let refreshPromise: Promise<void> | null = null

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error) {
    return "Impossible de contacter le serveur"
  }

  return null
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    requiresAuth = true,
    retryOnUnauthorized = true,
    ...requestOptions
  } = options
  const accessToken = getAccessToken()

  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    headers: {
      "Content-Type": "application/json",
      ...(requiresAuth && accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {}),
      ...requestOptions.headers,
    },
  })

  if (response.status === 401 && requiresAuth && retryOnUnauthorized) {
    try {
      await refreshTokens()
      // Retry the original request once with the renewed access token.
      return apiRequest<T>(path, { ...options, retryOnUnauthorized: false })
    } catch {
      clearTokens()
    }
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody

    throw new ApiError(
      response.status,
      body.detail ?? "Une erreur est survenue",
    )
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T
  }

  const text = await response.text()
  if (!text) {
    return undefined as T
  }

  return JSON.parse(text) as T
}

async function refreshTokens() {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken()

    if (!refreshToken) {
      throw new Error("Missing refresh token")
    }

    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!response.ok) {
      throw new Error("Session expired")
    }

    const session = (await response.json()) as RefreshResponse
    saveTokens(session.access_token, session.refresh_token)
  })().finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

/** Refresh JWT and return the new access token (used by the WebSocket client). */
export async function refreshSessionAccessToken() {
  await refreshTokens()
  const accessToken = getAccessToken()
  if (!accessToken) {
    throw new Error("Missing access token after refresh")
  }
  return accessToken
}

export function getApiBaseUrl() {
  return API_URL
}

/**
 * Authenticated file download (CSV/PDF, etc.). Triggers a browser save dialog.
 */
export async function apiDownload(
  path: string,
  options: {
    filename: string
    requiresAuth?: boolean
    retryOnUnauthorized?: boolean
  },
): Promise<void> {
  const {
    filename,
    requiresAuth = true,
    retryOnUnauthorized = true,
  } = options
  const accessToken = getAccessToken()

  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      ...(requiresAuth && accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {}),
    },
  })

  if (response.status === 401 && requiresAuth && retryOnUnauthorized) {
    try {
      await refreshTokens()
      return apiDownload(path, {
        filename,
        requiresAuth,
        retryOnUnauthorized: false,
      })
    } catch {
      clearTokens()
    }
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody
    throw new ApiError(
      response.status,
      body.detail ?? "Impossible de télécharger le fichier",
    )
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
