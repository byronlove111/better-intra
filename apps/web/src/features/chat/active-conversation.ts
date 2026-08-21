/** Tracks which conversation is open so WS unread bumps stay accurate. */
let activeConversationId: number | null = null

export function setActiveConversationId(id: number | null) {
  activeConversationId = id
}

export function getActiveConversationId() {
  return activeConversationId
}
