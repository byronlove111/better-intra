import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import type { AuthUser } from "@/features/auth/auth-api"
import { clearTokens, getAccessToken } from "@/features/auth/auth-storage"
import { getActiveConversationId } from "@/features/chat/active-conversation"
import {
  applyConversationRead,
  applyMessageCreated,
  isChatMessage,
  isConversationRead,
} from "@/features/chat/chat-cache"
import { getDashboardOnlineFriends } from "@/features/dashboard/dashboard-api"
import {
  markPresenceOffline,
  markPresenceOnline,
  presenceOnlineQueryKey,
  setPresenceOnline,
} from "@/features/realtime/presence-cache"
import {
  isPresencePeer,
  type PresenceSnapshotPayload,
  type WsServerEvent,
} from "@/features/realtime/presence-types"
import { getRealtimeWsUrl } from "@/features/realtime/ws-url"
import { refreshSessionAccessToken } from "@/lib/api"

const KEEPALIVE_MS = 25_000
const RECONNECT_BASE_MS = 1_000
const RECONNECT_MAX_MS = 20_000

/**
 * One app-wide WebSocket while Intra is linked.
 * Seeds from GET /presence, then applies presence.* (+ notification.created invalidate).
 */
export function useRealtimeSocket(enabled: boolean) {
  const queryClient = useQueryClient()

  useQuery({
    queryKey: presenceOnlineQueryKey,
    queryFn: getDashboardOnlineFriends,
    enabled,
  })

  useEffect(() => {
    if (!enabled) return

    let disposed = false
    let socket: WebSocket | null = null
    let reconnectTimer: number | undefined
    let keepaliveTimer: number | undefined
    let attempt = 0

    function clearTimers() {
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer)
        reconnectTimer = undefined
      }
      if (keepaliveTimer !== undefined) {
        window.clearInterval(keepaliveTimer)
        keepaliveTimer = undefined
      }
    }

    function stopKeepalive() {
      if (keepaliveTimer !== undefined) {
        window.clearInterval(keepaliveTimer)
        keepaliveTimer = undefined
      }
    }

    function startKeepalive(active: WebSocket) {
      stopKeepalive()
      keepaliveTimer = window.setInterval(() => {
        if (active.readyState === WebSocket.OPEN) {
          active.send("ping")
        }
      }, KEEPALIVE_MS)
    }

    function handleEvent(event: WsServerEvent) {
      if (event.type === "presence.snapshot") {
        const payload = event.payload as PresenceSnapshotPayload
        const online = Array.isArray(payload?.online)
          ? payload.online.filter(isPresencePeer)
          : []
        setPresenceOnline(queryClient, online)
        return
      }

      if (event.type === "presence.online" && isPresencePeer(event.payload)) {
        markPresenceOnline(queryClient, event.payload)
        return
      }

      if (event.type === "presence.offline" && isPresencePeer(event.payload)) {
        markPresenceOffline(queryClient, event.payload)
        return
      }

      if (event.type === "message.created" && isChatMessage(event.payload)) {
        const me = queryClient.getQueryData<AuthUser>(["auth", "me"])
        applyMessageCreated(queryClient, event.payload, {
          currentUserId: me?.id ?? null,
          activeConversationId: getActiveConversationId(),
        })
        void queryClient.invalidateQueries({ queryKey: ["notifications"] })
        return
      }

      if (event.type === "conversation.read" && isConversationRead(event.payload)) {
        const me = queryClient.getQueryData<AuthUser>(["auth", "me"])
        applyConversationRead(queryClient, event.payload, {
          currentUserId: me?.id ?? null,
        })
        return
      }

      if (event.type === "notification.created") {
        void queryClient.invalidateQueries({ queryKey: ["notifications"] })
      }
    }

    function scheduleReconnect() {
      if (disposed) return
      const delay = Math.min(
        RECONNECT_BASE_MS * 2 ** attempt,
        RECONNECT_MAX_MS,
      )
      attempt += 1
      reconnectTimer = window.setTimeout(() => {
        void connect()
      }, delay)
    }

    async function connect() {
      if (disposed) return

      clearTimers()
      if (socket) {
        socket.onopen = null
        socket.onmessage = null
        socket.onclose = null
        socket.onerror = null
        if (
          socket.readyState === WebSocket.OPEN
          || socket.readyState === WebSocket.CONNECTING
        ) {
          socket.close()
        }
        socket = null
      }

      let token = getAccessToken()
      if (!token) return

      // Prefer a fresh JWT before (re)connecting after auth failures.
      if (attempt > 0) {
        try {
          token = await refreshSessionAccessToken()
        } catch {
          clearTokens()
          queryClient.clear()
          return
        }
      }

      if (disposed) return

      const next = new WebSocket(getRealtimeWsUrl(token))
      socket = next

      next.onopen = () => {
        attempt = 0
        startKeepalive(next)
      }

      next.onmessage = (message) => {
        try {
          handleEvent(JSON.parse(message.data) as WsServerEvent)
        } catch {
          // Ignore malformed frames.
        }
      }

      next.onclose = (closeEvent) => {
        stopKeepalive()
        if (disposed) return

        // 4401 = bad/expired token — refresh then retry.
        if (closeEvent.code === 4401 || closeEvent.code === 4403) {
          void (async () => {
            if (closeEvent.code === 4403) {
              // Intra not linked — do not spam reconnect.
              return
            }
            try {
              await refreshSessionAccessToken()
              scheduleReconnect()
            } catch {
              clearTokens()
              queryClient.clear()
            }
          })()
          return
        }

        scheduleReconnect()
      }

      next.onerror = () => {
        // onclose handles reconnect.
      }
    }

    void connect()

    return () => {
      disposed = true
      clearTimers()
      if (socket) {
        socket.onopen = null
        socket.onmessage = null
        socket.onclose = null
        socket.onerror = null
        socket.close()
        socket = null
      }
    }
  }, [enabled, queryClient])
}
