import { apiRequest } from "@/lib/api"

export type ChatPeer = {
  id: number
  login: string
  display_name: string | null
  avatar_url: string | null
  is_online: boolean
}

export type ChatMessage = {
  id: number
  conversation_id: number
  sender_id: number
  body: string
  created_at: string
}

export type Conversation = {
  id: number
  peer: ChatPeer
  last_message: ChatMessage | null
  unread_count: number
  last_read_message_id: number | null
  peer_last_read_message_id: number | null
  updated_at: string
  created_at: string
}

export type MessagesPage = {
  items: ChatMessage[]
  has_more: boolean
}

export type ConversationRead = {
  conversation_id: number
  user_id: number
  last_read_message_id: number | null
  last_read_at: string
}

export function listConversations() {
  return apiRequest<Conversation[]>("/conversations")
}

export function getConversation(conversationId: number) {
  return apiRequest<Conversation>(`/conversations/${conversationId}`)
}

export function listMessages(conversationId: number, options?: {
  beforeId?: number
  limit?: number
}) {
  const params = new URLSearchParams()
  params.set("limit", String(options?.limit ?? 50))
  if (options?.beforeId != null) {
    params.set("before_id", String(options.beforeId))
  }
  return apiRequest<MessagesPage>(
    `/conversations/${conversationId}/messages?${params}`,
  )
}

export function sendMessage(toLogin: string, body: string) {
  return apiRequest<ChatMessage>("/messages", {
    method: "POST",
    body: JSON.stringify({ to_login: toLogin, body }),
  })
}

export function markConversationRead(
  conversationId: number,
  messageId?: number,
) {
  return apiRequest<ConversationRead>(
    `/conversations/${conversationId}/read`,
    {
      method: "POST",
      body: JSON.stringify(
        messageId != null ? { message_id: messageId } : {},
      ),
    },
  )
}

export const conversationsQueryKey = ["chat", "conversations"] as const

export function conversationMessagesQueryKey(conversationId: number) {
  return ["chat", "messages", conversationId] as const
}

export function conversationQueryKey(conversationId: number) {
  return ["chat", "conversation", conversationId] as const
}
