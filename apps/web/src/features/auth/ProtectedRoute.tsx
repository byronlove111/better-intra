import { useQuery } from "@tanstack/react-query"
import { Navigate, Outlet } from "react-router-dom"

import { getCurrentUser } from "@/features/auth/auth-api"
import {
  clearTokens,
  getAccessToken,
} from "@/features/auth/auth-storage"

export function ProtectedRoute() {
  const accessToken = getAccessToken()

  const currentUserQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    enabled: Boolean(accessToken),
    retry: false,
  })

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  if (currentUserQuery.isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement de la session…</p>
      </main>
    )
  }

  if (currentUserQuery.isError) {
    clearTokens()
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
