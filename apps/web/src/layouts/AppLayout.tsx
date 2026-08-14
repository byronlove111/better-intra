import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Bell,
  ClipboardCheck,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Timer,
  UserRound,
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
      || preview === "logtime"
    )
  const currentUser = queryClient.getQueryData<AuthUser>(["auth", "me"])
  const notificationsRequest = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    enabled: !isPreview && currentUser?.is_intra_linked === true,
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

  return (
    <div className="min-h-screen bg-muted/40 md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b bg-background md:min-h-screen md:border-r md:border-b-0">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <span className="text-lg font-semibold">BetterIntra</span>

          <Button variant="ghost" size="icon" onClick={logout} className="md:hidden">
            <LogOut data-icon="inline-start" />
            <span className="sr-only">Se déconnecter</span>
          </Button>
        </div>

        <nav className="flex gap-2 overflow-x-auto px-4 pb-4 md:flex-col md:overflow-visible md:pb-0">
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
            to={isPreview ? "/logtime?preview=logtime" : "/logtime"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <Timer />
            Logtime
          </NavLink>
        </nav>

        <div className="hidden px-4 md:block">
          <Button variant="ghost" className="w-full justify-start" onClick={logout}>
            <LogOut data-icon="inline-start" />
            Déconnexion
          </Button>
        </div>
      </aside>

      <div>
        <header className="flex h-16 items-center gap-3 border-b bg-background px-4 md:px-8">
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

        <main className="p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
