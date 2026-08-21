import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "@/components/ui/message"
import {
  MessageScrollerItem,
} from "@/components/ui/message-scroller"
import type { ChatMessage, ChatPeer } from "@/features/chat/chat-api"
import { getInitials } from "@/features/profile/profile-display"
import { resolveMediaUrl } from "@/lib/api"

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

type MessageCluster = {
  senderId: number
  messages: ChatMessage[]
}

function clusterMessages(messages: ChatMessage[]): MessageCluster[] {
  const clusters: MessageCluster[] = []
  for (const message of messages) {
    const last = clusters[clusters.length - 1]
    if (last && last.senderId === message.sender_id) {
      last.messages.push(message)
    } else {
      clusters.push({ senderId: message.sender_id, messages: [message] })
    }
  }
  return clusters
}

type ChatMessageListProps = {
  messages: ChatMessage[]
  currentUserId: number
  peer: ChatPeer
  me: {
    login: string
    display_name: string | null
    avatar_url: string | null
  }
  peerLastReadMessageId: number | null
}

export function ChatMessageList({
  messages,
  currentUserId,
  peer,
  me,
  peerLastReadMessageId,
}: ChatMessageListProps) {
  if (messages.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Dis bonjour à @{peer.login}.
      </p>
    )
  }

  return (
    <>
      {clusterMessages(messages).map((cluster) => {
        const mine = cluster.senderId === currentUserId
        const sender = mine
          ? {
              login: me.login,
              display_name: me.display_name,
              avatar_url: me.avatar_url,
            }
          : peer
        const label = sender.display_name ?? sender.login

        return (
          <MessageGroup key={`${cluster.senderId}-${cluster.messages[0]?.id}`}>
            {cluster.messages.map((message, index) => {
              const isLast = index === cluster.messages.length - 1
              const readByPeer =
                mine
                && peerLastReadMessageId != null
                && message.id <= peerLastReadMessageId

              return (
                <MessageScrollerItem
                  key={message.id}
                  messageId={String(message.id)}
                  scrollAnchor={mine && isLast}
                >
                  <Message align={mine ? "end" : "start"}>
                    <MessageAvatar>
                      {isLast ? (
                        <Avatar>
                          <AvatarImage
                            src={resolveMediaUrl(sender.avatar_url)}
                            alt={`Photo de ${sender.login}`}
                          />
                          <AvatarFallback>
                            {getInitials(label)}
                          </AvatarFallback>
                        </Avatar>
                      ) : null}
                    </MessageAvatar>
                    <MessageContent>
                      {index === 0 ? (
                        <MessageHeader>{label}</MessageHeader>
                      ) : null}
                      <Bubble
                        variant={mine ? "default" : "secondary"}
                        align={mine ? "end" : "start"}
                      >
                        <BubbleContent>{message.body}</BubbleContent>
                      </Bubble>
                      {isLast ? (
                        <MessageFooter>
                          {formatMessageTime(message.created_at)}
                          {readByPeer ? " · Lu" : ""}
                        </MessageFooter>
                      ) : null}
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              )
            })}
          </MessageGroup>
        )
      })}
    </>
  )
}
