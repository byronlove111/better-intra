import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Bell,
  ClipboardCheck,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  UserRound,
  Users,
} from "lucide-react"
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AuthUser } from "@/features/auth/auth-api"
import { clearTokens } from "@/features/auth/auth-storage"
import { getNotifications } from "@/features/dashboard/dashboard-api"
import { useRealtimeSocket } from "@/features/realtime/useRealtimeSocket"
import { UserSearch } from "@/features/search/UserSearch"
import { cn } from "@/lib/utils"

const previewNotifications = [
  {
    id: 1,
    body: "Alice a commencé à te suivre.",
    url: "/dashboard",
  },
  {
    id: 2,
    body: "Un nouvel événement BetterIntra a été créé.",
    url: "/dashboard",
  },
]

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const preview = new URLSearchParams(location.search).get("preview")
  const isPreview = import.meta.env.DEV
    && (
      preview === "dashboard"
      || preview === "profile"
      || preview === "projects"
      || preview === "evaluations"
    )
  const currentUser = queryClient.getQueryData<AuthUser>(["auth", "me"])
  const realtimeEnabled =
    !isPreview && currentUser?.is_intra_linked === true
  useRealtimeSocket(realtimeEnabled)
  const notificationsRequest = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    enabled: realtimeEnabled,
  })
  const notifications = isPreview
    ? previewNotifications
    : (notificationsRequest.data ?? [])
  let notificationsMessage: string | null = null

  if (!isPreview && currentUser?.is_intra_linked !== true) {
    notificationsMessage = "Lie ton compte 42 pour recevoir des notifications."
  } else if (!isPreview && notificationsRequest.isPending) {
    notificationsMessage = "Chargement des notifications…"
  } else if (!isPreview && notificationsRequest.isError) {
    notificationsMessage = "Les notifications sont indisponibles."
  } else if (notifications.length === 0) {
    notificationsMessage = "Aucune notification récente"
  }

  function logout() {
    clearTokens()
    queryClient.clear()
    navigate("/login", { replace: true })
  }

  const isChatRoute = location.pathname.startsWith("/conversations")

  return (
    <div
      className={cn(
        "bg-muted/40 md:grid md:h-svh md:grid-cols-[220px_1fr] md:overflow-hidden",
        isChatRoute
          ? "flex h-svh flex-col overflow-hidden md:grid"
          : "min-h-svh",
      )}
    >
      <aside className="border-b bg-background md:min-h-0 md:overflow-y-auto md:border-r md:border-b-0">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <span className="text-lg font-semibold">BetterIntra</span>

          <Button variant="ghost" size="icon" onClick={logout} className="md:hidden">
            <LogOut data-icon="inline-start" />
            <span className="sr-only">Se déconnecter</span>
          </Button>
        </div>

        <nav className="flex gap-2 px-4 pb-4 md:flex-col md:pb-0">
          <NavLink
            to={isPreview ? "/dashboard?preview=dashboard" : "/dashboard"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <LayoutDashboard />
            Dashboard
          </NavLink>
          <NavLink
            to={isPreview ? "/profile?preview=profile" : "/profile"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <UserRound />
            Profil
          </NavLink>
          <NavLink
            to={isPreview ? "/projects?preview=projects" : "/projects"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <FolderKanban />
            Projets
          </NavLink>
          <NavLink
            to={isPreview
              ? "/evaluations?preview=evaluations"
              : "/evaluations"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <ClipboardCheck />
            Évaluations
          </NavLink>
          <NavLink
            to="/friends"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <Users />
            Amis
          </NavLink>
          <NavLink
            to="/conversations"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <MessageCircle />
            Messages
          </NavLink>
        </nav>

        <div className="hidden px-4 md:block">
          <Button variant="ghost" className="w-full justify-start" onClick={logout}>
            <LogOut data-icon="inline-start" />
            Déconnexion
          </Button>
        </div>
      </aside>

      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-col",
          isChatRoute && "flex-1",
        )}
      >
        <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-background px-4 md:px-8">
          <div className="flex-1">
            <UserSearch
              isPreview={isPreview}
              canSearch={isPreview || currentUser?.is_intra_linked === true}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon">
                  <Bell />
                  <span className="sr-only">Ouvrir les notifications</span>
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuGroup>
                {notificationsMessage ? (
                  <DropdownMenuItem disabled>
                    {notificationsMessage}
                  </DropdownMenuItem>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      render={
                        <Link
                          to={isPreview
                            ? `${notification.url}?preview=dashboard`
                            : notification.url}
                        />
                      }
                    >
                      {notification.body}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
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
      </div>
    </div>
  )
}
