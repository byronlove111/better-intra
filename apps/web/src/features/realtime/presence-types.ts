export type PresencePeer = {
  id: number
  login: string | null
  display_name: string | null
  avatar_url: string | null
  is_online: boolean
}

export type PresenceSnapshotPayload = {
  online: PresencePeer[]
}

export type WsServerEvent =
  | { type: "presence.snapshot"; payload: PresenceSnapshotPayload }
  | { type: "presence.online"; payload: PresencePeer }
  | { type: "presence.offline"; payload: PresencePeer }
  | { type: "notification.created"; payload: unknown }
  | { type: "message.created"; payload: unknown }
  | { type: "conversation.read"; payload: unknown }
  | { type: string; payload: unknown }

export function isPresencePeer(value: unknown): value is PresencePeer {
  if (!value || typeof value !== "object") return false
  const peer = value as Record<string, unknown>
  return typeof peer.id === "number" && typeof peer.is_online === "boolean"
}
