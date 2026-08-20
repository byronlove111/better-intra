import type { QueryClient } from "@tanstack/react-query"

import {
  type ChatMessage,
  type Conversation,
  type ConversationRead,
  type MessagesPage,
  conversationMessagesQueryKey,
  conversationsQueryKey,
  conversationQueryKey,
} from "@/features/chat/chat-api"

export function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false
  const message = value as Record<string, unknown>
  return (
    typeof message.id === "number"
    && typeof message.conversation_id === "number"
    && typeof message.sender_id === "number"
    && typeof message.body === "string"
    && typeof message.created_at === "string"
  )
}

export function isConversationRead(value: unknown): value is ConversationRead {
  if (!value || typeof value !== "object") return false
  const read = value as Record<string, unknown>
  return (
    typeof read.conversation_id === "number"
    && typeof read.user_id === "number"
  )
}

function upsertMessage(items: ChatMessage[], message: ChatMessage) {
  if (items.some((item) => item.id === message.id)) return items
  return [...items, message].sort((a, b) => a.id - b.id)
}

export function applyMessageCreated(
  queryClient: QueryClient,
  message: ChatMessage,
  options: {
    currentUserId: number | null
    activeConversationId: number | null
  },
) {
  const { currentUserId, activeConversationId } = options

  queryClient.setQueryData<MessagesPage>(
    conversationMessagesQueryKey(message.conversation_id),
    (current) => {
      if (!current) return current
      return {
        ...current,
        items: upsertMessage(current.items, message),
      }
    },
  )

  const isOwn = currentUserId != null && message.sender_id === currentUserId
  const isActive = activeConversationId === message.conversation_id

  queryClient.setQueryData<Conversation[]>(conversationsQueryKey, (current) => {
    if (!current) return current

    const existing = current.find((item) => item.id === message.conversation_id)
    if (!existing) {
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey })
      return current
    }

    const unreadBump = !isOwn && !isActive ? 1 : 0
    const next: Conversation = {
      ...existing,
      last_message: message,
      updated_at: message.created_at,
      unread_count: existing.unread_count + unreadBump,
      last_read_message_id: isOwn || isActive
        ? message.id
        : existing.last_read_message_id,
    }

    return [
      next,
      ...current.filter((item) => item.id !== message.conversation_id),
    ]
  })

  queryClient.setQueryData<Conversation>(
    conversationQueryKey(message.conversation_id),
    (current) => {
      if (!current) return current
      return {
        ...current,
        last_message: message,
        updated_at: message.created_at,
        unread_count: !isOwn && !isActive
          ? current.unread_count + 1
          : current.unread_count,
        last_read_message_id: isOwn || isActive
          ? message.id
          : current.last_read_message_id,
      }
    },
  )
}

export function applyConversationRead(
  queryClient: QueryClient,
  read: ConversationRead,
  options: {
    currentUserId: number | null
  },
) {
  const { currentUserId } = options
  const isOwn = currentUserId != null && read.user_id === currentUserId

  queryClient.setQueryData<Conversation[]>(conversationsQueryKey, (current) => {
    if (!current) return current
    return current.map((conversation) => {
      if (conversation.id !== read.conversation_id) return conversation
      if (isOwn) {
        return {
          ...conversation,
          last_read_message_id: read.last_read_message_id,
          unread_count: 0,
        }
      }
      return {
        ...conversation,
        peer_last_read_message_id: read.last_read_message_id,
      }
    })
  })

  queryClient.setQueryData<Conversation>(
    conversationQueryKey(read.conversation_id),
    (current) => {
      if (!current) return current
      if (isOwn) {
        return {
          ...current,
          last_read_message_id: read.last_read_message_id,
          unread_count: 0,
        }
      }
      return {
        ...current,
        peer_last_read_message_id: read.last_read_message_id,
      }
    },
  )
}
