import type { LucideIcon } from "lucide-react"
import {
  CalendarDays,
  ChevronsUpDown,
  ClipboardCheck,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Scale,
  ShieldCheck,
  Timer,
  Users,
} from "lucide-react"
import { Link, NavLink, useLocation } from "react-router-dom"

import logo from "@/assets/logo.png"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  useSidebar,
} from "@/components/ui/sidebar"
import type { AuthUser } from "@/features/auth/auth-api"
import { getInitials } from "@/features/profile/profile-display"
import { resolveMediaUrl } from "@/lib/api"

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
      title: "Messages",
      to: isPreview ? "/conversations?preview=message" : "/conversations",
      icon: MessageCircle,
      match: (pathname) => pathname.startsWith("/conversations"),
    },
    {
      title: "Amis",
      to: "/friends",
      icon: Users,
      match: (pathname) => pathname === "/friends",
    },
    {
      title: "Agenda",
      to: "/agenda",
      icon: CalendarDays,
      match: (pathname) => pathname === "/agenda",
    },
    {
      title: "Projets",
      to: isPreview ? "/projects?preview=projects" : "/projects",
      icon: FolderKanban,
      match: (pathname) => pathname === "/projects",
    },
    {
      title: "Logtime",
      to: "/logtime",
      icon: Timer,
      match: (pathname) => pathname === "/logtime",
    },
    {
      title: "Évaluations",
      to: isPreview ? "/evaluations?preview=evaluations" : "/evaluations",
      icon: ClipboardCheck,
      match: (pathname) => pathname === "/evaluations",
    },
  ]
}

function NavUser({
  isPreview,
  currentUser,
  onLogout,
}: {
  isPreview: boolean
  currentUser: AuthUser | undefined
  onLogout: () => void
}) {
  const { isMobile } = useSidebar()

  const displayName =
    currentUser?.display_name
    ?? currentUser?.login
    ?? (isPreview ? "Preview" : "Compte")
  const login = currentUser?.login ?? (isPreview ? "preview" : null)
  const handle = login ? `@${login}` : "Mon profil"
  const profileTo = isPreview ? "/profile?preview=profile" : "/profile"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
                tooltip={displayName}
              />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarImage
                src={resolveMediaUrl(currentUser?.avatar_url, currentUser?.updated_at)}
                alt={displayName}
              />
              <AvatarFallback className="rounded-lg">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              <span className="truncate text-xs text-muted-foreground">
                {handle}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem
                render={<Link to={profileTo} />}
                className="gap-2 p-2"
              >
                <Avatar className="size-8 rounded-lg">
                  <AvatarImage
                    src={resolveMediaUrl(currentUser?.avatar_url, currentUser?.updated_at)}
                    alt={displayName}
                  />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {handle}
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link to="/privacy" />}>
                <ShieldCheck />
                Confidentialité
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to="/terms" />}>
                <Scale />
                Conditions
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onLogout}>
                <LogOut />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export function AppSidebar({
  isPreview,
  currentUser,
  onLogout,
}: AppSidebarProps) {
  const location = useLocation()
  const items = buildNavItems(isPreview)

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
              <img
                src={logo}
                alt="BetterIntra"
                className="size-7 shrink-0 bg-transparent object-contain"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">BetterIntra</span>
                <span className="truncate text-xs text-muted-foreground">
                  42 Paris
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
        <NavUser
          isPreview={isPreview}
          currentUser={currentUser}
          onLogout={onLogout}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
