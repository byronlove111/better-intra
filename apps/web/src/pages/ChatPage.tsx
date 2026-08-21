import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, MessageCircle, SendHorizontal } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import {
  Message,
  MessageContent,
  MessageFooter,
} from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { getCurrentUser } from "@/features/auth/auth-api"
import { setActiveConversationId } from "@/features/chat/active-conversation"
import {
  type ChatMessage,
  type Conversation,
  conversationMessagesQueryKey,
  conversationQueryKey,
  conversationsQueryKey,
  getConversation,
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage,
} from "@/features/chat/chat-api"
import { applyMessageCreated } from "@/features/chat/chat-cache"
import { getInitials } from "@/features/profile/profile-display"
import { getApiErrorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatListTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function ConversationListItem({
  conversation,
  active,
}: {
  conversation: Conversation
  active: boolean
}) {
  const peer = conversation.peer
  const preview = conversation.last_message?.body ?? "Aucun message"

  return (
    <Link
      to={`/conversations/${conversation.id}`}
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50",
        active && "border-ring bg-muted",
      )}
    >
      <div className="relative shrink-0">
        <Avatar>
          <AvatarImage
            src={peer.avatar_url ?? undefined}
            alt={`Photo de ${peer.login}`}
          />
          <AvatarFallback>
            {getInitials(peer.display_name ?? peer.login)}
          </AvatarFallback>
        </Avatar>
        {peer.is_online && (
          <span className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-background bg-primary" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-medium">
            {peer.display_name ?? peer.login}
          </p>
          {conversation.last_message && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatListTime(conversation.last_message.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className="truncate text-sm text-muted-foreground">{preview}</p>
          {conversation.unread_count > 0 && (
            <Badge variant="default" className="shrink-0">
              {conversation.unread_count}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  )
}

function ChatComposer({
  disabled,
  pending,
  onSend,
  error,
}: {
  disabled: boolean
  pending: boolean
  onSend: (body: string) => void
  error: string | null
}) {
  const [draft, setDraft] = useState("")

  function submit() {
    const body = draft.trim()
    if (!body || pending || disabled) return
    onSend(body)
    setDraft("")
  }

  return (
    <div className="flex flex-col gap-2 border-t bg-background p-3">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <InputGroup>
        <InputGroupTextarea
          value={draft}
          disabled={disabled || pending}
          placeholder="Écrire un message…"
          rows={1}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }}
        />
        <InputGroupAddon align="block-end">
          <InputGroupButton
            variant="default"
            size="sm"
            disabled={disabled || pending || !draft.trim()}
            onClick={submit}
          >
            <SendHorizontal data-icon="inline-start" />
            Envoyer
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

function ChatThread({
  conversationId,
  currentUserId,
}: {
  conversationId: number
  currentUserId: number
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const conversationRequest = useQuery({
    queryKey: conversationQueryKey(conversationId),
    queryFn: () => getConversation(conversationId),
  })

  const messagesRequest = useQuery({
    queryKey: conversationMessagesQueryKey(conversationId),
    queryFn: () => listMessages(conversationId),
  })

  useEffect(() => {
    setActiveConversationId(conversationId)
    return () => setActiveConversationId(null)
  }, [conversationId])

  useEffect(() => {
    if (!messagesRequest.isSuccess) return
    void markConversationRead(conversationId)
      .then(() => {
        queryClient.setQueryData<Conversation[]>(
          conversationsQueryKey,
          (current) =>
            current?.map((item) =>
              item.id === conversationId
                ? { ...item, unread_count: 0 }
                : item,
            ),
        )
      })
      .catch(() => {
        // Read receipts are best-effort.
      })
  }, [conversationId, messagesRequest.isSuccess, queryClient])

  const sendRequest = useMutation({
    mutationFn: (body: string) => {
      const peerLogin = conversationRequest.data?.peer.login
      if (!peerLogin) throw new Error("Peer missing")
      return sendMessage(peerLogin, body)
    },
    onSuccess: (message) => {
      applyMessageCreated(queryClient, message, {
        currentUserId,
        activeConversationId: conversationId,
      })
    },
  })

  const conversation = conversationRequest.data
  const messages = messagesRequest.data?.items ?? []
  const loadError =
    getApiErrorMessage(conversationRequest.error)
    ?? getApiErrorMessage(messagesRequest.error)
  const sendError = getApiErrorMessage(sendRequest.error)

  if (conversationRequest.isPending || messagesRequest.isPending) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Chargement du chat…</p>
      </div>
    )
  }

  if (!conversation || loadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-destructive">
          {loadError ?? "Conversation introuvable"}
        </p>
        <Button variant="outline" onClick={() => navigate("/conversations")}>
          Retour aux conversations
        </Button>
      </div>
    )
  }

  const peer = conversation.peer

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          render={<Link to="/conversations" />}
        >
          <ArrowLeft />
          <span className="sr-only">Retour</span>
        </Button>
        <Avatar>
          <AvatarImage
            src={peer.avatar_url ?? undefined}
            alt={`Photo de ${peer.login}`}
          />
          <AvatarFallback>
            {getInitials(peer.display_name ?? peer.login)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">
              {peer.display_name ?? peer.login}
            </p>
            {peer.is_online && <Badge variant="secondary">En ligne</Badge>}
          </div>
          <p className="truncate text-sm text-muted-foreground">@{peer.login}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link to={`/profile/${encodeURIComponent(peer.login)}`} />}
        >
          Profil
        </Button>
      </header>

      <MessageScrollerProvider autoScroll>
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="gap-3 p-4">
              {messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Dis bonjour à @{peer.login}.
                </p>
              ) : (
                messages.map((message: ChatMessage) => {
                  const mine = message.sender_id === currentUserId
                  const readByPeer =
                    mine
                    && conversation.peer_last_read_message_id != null
                    && message.id <= conversation.peer_last_read_message_id

                  return (
                    <MessageScrollerItem
                      key={message.id}
                      messageId={String(message.id)}
                      scrollAnchor={mine}
                    >
                      <Message align={mine ? "end" : "start"}>
                        <MessageContent>
                          <Bubble
                            variant={mine ? "default" : "secondary"}
                            align={mine ? "end" : "start"}
                          >
                            <BubbleContent>{message.body}</BubbleContent>
                          </Bubble>
                          <MessageFooter>
                            {formatMessageTime(message.created_at)}
                            {readByPeer ? " · Lu" : ""}
                          </MessageFooter>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  )
                })
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      <ChatComposer
        disabled={false}
        pending={sendRequest.isPending}
        error={sendError}
        onSend={(body) => sendRequest.mutate(body)}
      />
    </div>
  )
}

function NewChatComposer({ currentUserId }: { currentUserId: number }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const toLogin = searchParams.get("to")?.trim() ?? ""

  const sendRequest = useMutation({
    mutationFn: (body: string) => sendMessage(toLogin, body),
    onSuccess: (message) => {
      applyMessageCreated(queryClient, message, {
        currentUserId,
        activeConversationId: message.conversation_id,
      })
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey })
      navigate(`/conversations/${message.conversation_id}`, { replace: true })
    },
  })

  if (!toLogin) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Chat</CardTitle>
            <CardDescription>
              Choisis une conversation à gauche, ou ouvre le profil d’un ami
              BetterIntra pour démarrer un DM.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b px-4 py-3">
        <p className="font-medium">Nouveau message</p>
        <p className="text-sm text-muted-foreground">@{toLogin}</p>
      </header>
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">
          Envoie un premier message pour créer le thread.
        </p>
      </div>
      <ChatComposer
        disabled={!toLogin}
        pending={sendRequest.isPending}
        error={getApiErrorMessage(sendRequest.error)}
        onSend={(body) => sendRequest.mutate(body)}
      />
    </div>
  )
}

export function ChatPage() {
  const { conversationId: conversationIdParam } = useParams()
  const conversationId = conversationIdParam
    ? Number.parseInt(conversationIdParam, 10)
    : null
  const hasValidConversationId =
    conversationId != null && Number.isFinite(conversationId)

  const currentUserRequest = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
  })
  const isIntraLinked = currentUserRequest.data?.is_intra_linked === true

  const conversationsRequest = useQuery({
    queryKey: conversationsQueryKey,
    queryFn: listConversations,
    enabled: isIntraLinked,
  })

  if (currentUserRequest.isPending) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>
  }

  if (!isIntraLinked || !currentUserRequest.data) {
    return (
      <Card className="max-w-xl border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle>Chat</CardTitle>
          <CardDescription>
            Lie ton compte Intra 42 pour discuter avec d’autres élèves
            BetterIntra.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link to="/dashboard" />}>
            Aller au dashboard
          </Button>
        </CardContent>
      </Card>
    )
  }

  const conversations = conversationsRequest.data ?? []
  const listError = getApiErrorMessage(conversationsRequest.error)

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden md:flex-row">
      <aside
        className={cn(
          "flex w-full shrink-0 flex-col border-b md:w-80 md:border-r md:border-b-0",
          hasValidConversationId && "hidden md:flex",
        )}
      >
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <MessageCircle className="text-muted-foreground" />
          <div>
            <h1 className="font-semibold tracking-tight">Messages</h1>
            <p className="text-xs text-muted-foreground">DM 1-to-1</p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
          {conversationsRequest.isPending && (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          )}
          {listError && (
            <p role="alert" className="text-sm text-destructive">
              {listError}
            </p>
          )}
          {!conversationsRequest.isPending
            && !listError
            && conversations.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucune conversation. Ouvre un profil BetterIntra pour écrire.
              </p>
            )}
          {conversations.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              active={conversation.id === conversationId}
            />
          ))}
        </div>
      </aside>

      <div
        className={cn(
          "min-h-0 min-w-0 flex-1 flex-col",
          hasValidConversationId ? "flex" : "hidden md:flex",
        )}
      >
        {hasValidConversationId ? (
          <ChatThread
            conversationId={conversationId}
            currentUserId={currentUserRequest.data.id}
          />
        ) : (
          <NewChatComposer currentUserId={currentUserRequest.data.id} />
        )}
      </div>
    </section>
  )
}
