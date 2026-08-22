import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import { Bell } from "lucide-react"
import { Link } from "react-router-dom"

import { EmptyState } from "@/components/EmptyState"
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
import {
  getNotifications,
  type Notification,
} from "@/features/dashboard/dashboard-api"

const TYPE_LABEL: Record<Notification["type"], string> = {
  dm: "Message",
  follow: "Ami",
  event: "Événement",
  announcement: "Annonce",
}

type NotificationsMenuProps = {
  currentUser: AuthUser | undefined
}

function resolveNotificationUrl(url: string) {
  if (url.startsWith("/users/")) {
    return `/profile/${url.slice("/users/".length)}`
  }
  return url || "/dashboard"
}

export function NotificationsMenu({ currentUser }: NotificationsMenuProps) {
  const canFetch = currentUser?.is_intra_linked === true

  const notificationsRequest = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    enabled: canFetch,
    refetchOnWindowFocus: true,
  })

  const notifications = canFetch ? (notificationsRequest.data ?? []) : []

  let emptyTitle: string | null = null
  let emptyDescription: string | undefined

  if (currentUser?.is_intra_linked !== true) {
    emptyTitle = "Compte 42 requis"
    emptyDescription = "Lie ton compte 42 pour recevoir des notifications."
  } else if (notificationsRequest.isPending) {
    emptyTitle = "Chargement…"
    emptyDescription = "Récupération des notifications."
  } else if (notificationsRequest.isError) {
    emptyTitle = "Indisponible"
    emptyDescription = "Les notifications sont temporairement indisponibles."
  } else if (notifications.length === 0) {
    emptyTitle = "Aucune notification"
    emptyDescription = "Aucune notification récente."
  }

  const showBadge = canFetch && notifications.length > 0

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="relative" />}
      >
        <Bell />
        {showBadge ? (
          <span
            aria-hidden
            className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary ring-2 ring-background"
          />
        ) : null}
        <span className="sr-only">Ouvrir les notifications</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          {emptyTitle ? (
            <div className="px-1 pb-1">
              <EmptyState
                className="py-6"
                icon={Bell}
                title={emptyTitle}
                description={emptyDescription}
              />
            </div>
          ) : (
            notifications.map((notification) => {
              const createdAt = new Date(notification.created_at)
              const when = Number.isNaN(createdAt.getTime())
                ? null
                : formatDistanceToNow(createdAt, {
                    addSuffix: true,
                    locale: fr,
                  })
              const typeLabel = TYPE_LABEL[notification.type] ?? "Notification"

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className="items-start py-2"
                  render={<Link to={resolveNotificationUrl(notification.url)} />}
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      {typeLabel}
                      {when ? ` · ${when}` : null}
                    </span>
                    <span className="whitespace-normal">{notification.body}</span>
                  </span>
                </DropdownMenuItem>
              )
            })
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
