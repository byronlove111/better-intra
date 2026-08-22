import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Outlet, useLocation, useNavigate } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getCurrentUser } from "@/features/auth/auth-api"
import { clearTokens, getAccessToken } from "@/features/auth/auth-storage"
import { NotificationsMenu } from "@/features/notifications/NotificationsMenu"
import { useRealtimeSocket } from "@/features/realtime/useRealtimeSocket"
import { UserSearch } from "@/features/search/UserSearch"
import { cn } from "@/lib/utils"

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const currentUserRequest = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    enabled: Boolean(getAccessToken()),
  })
  const currentUser = currentUserRequest.data
  const realtimeEnabled = currentUser?.is_intra_linked === true
  useRealtimeSocket(realtimeEnabled)

  function logout() {
    clearTokens()
    queryClient.clear()
    navigate("/login", { replace: true })
  }

  const isChatRoute = location.pathname.startsWith("/conversations")

  return (
    <TooltipProvider>
      <SidebarProvider className="h-svh overflow-hidden">
        <AppSidebar
          currentUser={currentUser}
          onLogout={logout}
        />
        <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
          <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-background px-4 md:px-6">
            <SidebarTrigger className="-ml-1" />
            <div className="w-full max-w-sm flex-1">
              <UserSearch
                canSearch={currentUser?.is_intra_linked === true}
              />
            </div>
            <div className="ml-auto">
              <NotificationsMenu
                currentUser={currentUser}
              />
            </div>
          </header>

          <main
            className={cn(
              "min-h-0 flex-1",
              isChatRoute
                ? "flex flex-col overflow-hidden p-0"
                : "overflow-auto p-4 md:p-8",
            )}
          >
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
