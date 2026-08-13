import { useQuery } from "@tanstack/react-query"
import { Navigate, Outlet, useLocation } from "react-router-dom"

import { getCurrentUser } from "@/features/auth/auth-api"
import {
  clearTokens,
  getAccessToken,
} from "@/features/auth/auth-storage"

export function ProtectedRoute() {
  const location = useLocation()
  const accessToken = getAccessToken()
  const preview = new URLSearchParams(location.search).get("preview")
  const isPreview = import.meta.env.DEV && (
    (location.pathname === "/dashboard" && preview === "dashboard")
    || (location.pathname.startsWith("/profile") && preview === "profile")
  )

  const currentUserQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    enabled: Boolean(accessToken) && !isPreview,
    retry: false,
  })

  if (isPreview) {
    return <Outlet />
  }

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
