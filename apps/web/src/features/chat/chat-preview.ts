import type { ChatMessage, ChatPeer, Conversation } from "@/features/chat/chat-api"

export const chatPreviewMe = {
  id: 1,
  login: "swan",
  display_name: "Swan",
  avatar_url: null as string | null,
}

export const chatPreviewPeer: ChatPeer = {
  id: 2,
  login: "malik",
  display_name: "Malik",
  avatar_url: null,
  is_online: true,
}

const now = Date.now()

export const chatPreviewMessages: ChatMessage[] = [
  {
    id: 1,
    conversation_id: 1,
    sender_id: chatPreviewPeer.id,
    body: "Salut ! Tu as vu le nouveau feed agenda ?",
    created_at: new Date(now - 1000 * 60 * 42).toISOString(),
  },
  {
    id: 2,
    conversation_id: 1,
    sender_id: chatPreviewPeer.id,
    body: "Les events Intra et BetterIntra sont mergés maintenant.",
    created_at: new Date(now - 1000 * 60 * 41).toISOString(),
  },
  {
    id: 3,
    conversation_id: 1,
    sender_id: chatPreviewMe.id,
    body: "Oui, je regarde. La cloche notifs marche aussi ?",
    created_at: new Date(now - 1000 * 60 * 38).toISOString(),
  },
  {
    id: 4,
    conversation_id: 1,
    sender_id: chatPreviewPeer.id,
    body: "Oui — follow, DM et nouvel event.",
    created_at: new Date(now - 1000 * 60 * 35).toISOString(),
  },
  {
    id: 5,
    conversation_id: 1,
    sender_id: chatPreviewMe.id,
    body: "Parfait, je polish l’UI Message + Bubble.",
    created_at: new Date(now - 1000 * 60 * 2).toISOString(),
  },
]

export const chatPreviewConversation: Conversation = {
  id: 1,
  peer: chatPreviewPeer,
  last_message: chatPreviewMessages[chatPreviewMessages.length - 1] ?? null,
  unread_count: 0,
  last_read_message_id: 5,
  peer_last_read_message_id: 3,
  updated_at: new Date(now - 1000 * 60 * 2).toISOString(),
  created_at: new Date(now - 1000 * 60 * 60).toISOString(),
}

export const chatPreviewConversations: Conversation[] = [
  chatPreviewConversation,
  {
    id: 2,
    peer: {
      id: 3,
      login: "ayoub",
      display_name: "Ayoub",
      avatar_url: null,
      is_online: false,
    },
    last_message: {
      id: 10,
      conversation_id: 2,
      sender_id: 3,
      body: "Compose up est prêt pour la démo.",
      created_at: new Date(now - 1000 * 60 * 90).toISOString(),
    },
    unread_count: 2,
    last_read_message_id: null,
    peer_last_read_message_id: null,
    updated_at: new Date(now - 1000 * 60 * 90).toISOString(),
    created_at: new Date(now - 1000 * 60 * 120).toISOString(),
  },
]
