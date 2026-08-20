import type { QueryClient } from "@tanstack/react-query"

import type { Conversation } from "@/features/chat/chat-api"
import { conversationsQueryKey } from "@/features/chat/chat-api"
import type { FriendList } from "@/features/friends/friends-api"
import type { UserProfile } from "@/features/profile/profile-api"
import type { PresencePeer } from "@/features/realtime/presence-types"

export const presenceOnlineQueryKey = ["presence", "online"] as const

function upsertPeer(peers: PresencePeer[], peer: PresencePeer) {
  const without = peers.filter((item) => item.id !== peer.id)
  if (!peer.is_online) return without
  return [...without, { ...peer, is_online: true }]
}

function patchFriendList(
  list: FriendList | undefined,
  userId: number,
  isOnline: boolean | null,
) {
  if (!list) return list

  return {
    ...list,
    items: list.items.map((friend) =>
      friend.betterintra_user_id === userId
        ? { ...friend, is_online: isOnline }
        : friend,
    ),
  }
}

function patchFriendLists(
  queryClient: QueryClient,
  userId: number,
  isOnline: boolean | null,
) {
  for (const key of [
    ["friends", "following"],
    ["friends", "followers"],
  ] as const) {
    queryClient.setQueryData<FriendList>(key, (current) =>
      patchFriendList(current, userId, isOnline),
    )
  }
}

function patchProfiles(
  queryClient: QueryClient,
  userId: number,
  isOnline: boolean | null,
) {
  queryClient.setQueriesData<UserProfile>(
    { queryKey: ["profile"] },
    (current) => {
      if (!current || current.id !== userId) return current
      return { ...current, is_online: isOnline }
    },
  )
}

function patchConversations(
  queryClient: QueryClient,
  userId: number,
  isOnline: boolean,
) {
  queryClient.setQueryData<Conversation[]>(conversationsQueryKey, (current) => {
    if (!current) return current
    return current.map((conversation) =>
      conversation.peer.id === userId
        ? {
            ...conversation,
            peer: { ...conversation.peer, is_online: isOnline },
          }
        : conversation,
    )
  })
}

export function setPresenceOnline(
  queryClient: QueryClient,
  online: PresencePeer[],
) {
  const next = online
    .filter((peer) => peer.is_online)
    .map((peer) => ({ ...peer, is_online: true }))
  const previous =
    queryClient.getQueryData<PresencePeer[]>(presenceOnlineQueryKey) ?? []
  const nextIds = new Set(next.map((peer) => peer.id))

  queryClient.setQueryData<PresencePeer[]>(presenceOnlineQueryKey, next)

  for (const peer of previous) {
    if (!nextIds.has(peer.id)) {
      patchFriendLists(queryClient, peer.id, false)
      patchProfiles(queryClient, peer.id, false)
      patchConversations(queryClient, peer.id, false)
    }
  }

  for (const peer of next) {
    patchFriendLists(queryClient, peer.id, true)
    patchProfiles(queryClient, peer.id, true)
    patchConversations(queryClient, peer.id, true)
  }
}

export function markPresenceOnline(
  queryClient: QueryClient,
  peer: PresencePeer,
) {
  queryClient.setQueryData<PresencePeer[]>(presenceOnlineQueryKey, (current) =>
    upsertPeer(current ?? [], { ...peer, is_online: true }),
  )
  patchFriendLists(queryClient, peer.id, true)
  patchProfiles(queryClient, peer.id, true)
  patchConversations(queryClient, peer.id, true)
}

export function markPresenceOffline(
  queryClient: QueryClient,
  peer: PresencePeer,
) {
  queryClient.setQueryData<PresencePeer[]>(presenceOnlineQueryKey, (current) =>
    (current ?? []).filter((item) => item.id !== peer.id),
  )
  patchFriendLists(queryClient, peer.id, false)
  patchProfiles(queryClient, peer.id, false)
  patchConversations(queryClient, peer.id, false)
}
