import type { LucideIcon } from "lucide-react"
import {
  CalendarDays,
  ClipboardCheck,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Users,
} from "lucide-react"
import { Link, NavLink, useLocation } from "react-router-dom"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import type { AuthUser } from "@/features/auth/auth-api"
import { getInitials } from "@/features/profile/profile-display"

type NavItem = {
  title: string
  to: string
  icon: LucideIcon
  match?: (pathname: string) => boolean
}

type AppSidebarProps = {
  isPreview: boolean
  currentUser: AuthUser | undefined
  onLogout: () => void
}

function buildNavItems(isPreview: boolean): NavItem[] {
  return [
    {
      title: "Dashboard",
      to: isPreview ? "/dashboard?preview=dashboard" : "/dashboard",
      icon: LayoutDashboard,
      match: (pathname) => pathname === "/dashboard",
    },
    {
      title: "Projets",
      to: isPreview ? "/projects?preview=projects" : "/projects",
      icon: FolderKanban,
      match: (pathname) => pathname === "/projects",
    },
    {
      title: "Agenda",
      to: "/agenda",
      icon: CalendarDays,
      match: (pathname) => pathname === "/agenda",
    },
    {
      title: "Évaluations",
      to: isPreview ? "/evaluations?preview=evaluations" : "/evaluations",
      icon: ClipboardCheck,
      match: (pathname) => pathname === "/evaluations",
    },
    {
      title: "Amis",
      to: "/friends",
      icon: Users,
      match: (pathname) => pathname === "/friends",
    },
    {
      title: "Messages",
      to: isPreview ? "/conversations?preview=message" : "/conversations",
      icon: MessageCircle,
      match: (pathname) => pathname.startsWith("/conversations"),
    },
  ]
}

export function AppSidebar({
  isPreview,
  currentUser,
  onLogout,
}: AppSidebarProps) {
  const location = useLocation()
  const items = buildNavItems(isPreview)
  const displayName =
    currentUser?.display_name
    ?? currentUser?.login
    ?? (isPreview ? "Preview" : "Compte")
  const login = currentUser?.login ?? (isPreview ? "preview" : null)
  const profileTo = isPreview ? "/profile?preview=profile" : "/profile"

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link to={items[0]?.to ?? "/dashboard"} />}
              tooltip="BetterIntra"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <span className="text-sm font-semibold">BI</span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">BetterIntra</span>
                <span className="truncate text-xs text-muted-foreground">
                  Intra moderne
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = item.match?.(location.pathname) ?? false
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<NavLink to={item.to} />}
                      isActive={active}
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link to={profileTo} />}
              tooltip={displayName}
              isActive={location.pathname.startsWith("/profile")}
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarImage
                  src={currentUser?.avatar_url ?? undefined}
                  alt={displayName}
                />
                <AvatarFallback className="rounded-lg">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {login ? `@${login}` : "Mon profil"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Déconnexion"
              onClick={onLogout}
            >
              <LogOut />
              <span>Déconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
