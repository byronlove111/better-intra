import { useQueryClient } from "@tanstack/react-query"
import { LayoutDashboard, LogOut } from "lucide-react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { clearTokens } from "@/features/auth/auth-storage"
import { cn } from "@/lib/utils"

export function AppLayout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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

        <nav className="flex gap-2 px-4 pb-4 md:flex-col md:pb-0">
          <NavLink
            to="/dashboard"
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
        </nav>

        <div className="hidden px-4 md:block">
          <Button variant="ghost" className="w-full justify-start" onClick={logout}>
            <LogOut data-icon="inline-start" />
            Déconnexion
          </Button>
        </div>
      </aside>

      <main className="p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}
