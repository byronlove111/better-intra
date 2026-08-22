import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, MessageCircle, SendHorizontal } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"

import { EmptyState } from "@/components/EmptyState"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { getCurrentUser } from "@/features/auth/auth-api"
import { setActiveConversationId } from "@/features/chat/active-conversation"
import {
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
import { ChatMessageList } from "@/features/chat/ChatMessageList"
import {
  chatPreviewConversation,
  chatPreviewConversations,
  chatPreviewMe,
  chatPreviewMessages,
} from "@/features/chat/chat-preview"
import { getInitials } from "@/features/profile/profile-display"
import { getApiErrorMessage, resolveMediaUrl } from "@/lib/api"
import { cn } from "@/lib/utils"

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
  previewHref,
}: {
  conversation: Conversation
  active: boolean
  previewHref?: string
}) {
  const peer = conversation.peer
  const preview = conversation.last_message?.body ?? "Aucun message"

  return (
    <Link
      to={previewHref ?? `/conversations/${conversation.id}`}
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50",
        active && "border-ring bg-muted",
      )}
    >
      <div className="relative shrink-0">
        <Avatar>
          <AvatarImage
            src={resolveMediaUrl(peer.avatar_url)}
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function submit() {
    const body = draft.trim()
    if (!body || pending || disabled) return
    onSend(body)
    setDraft("")
    textareaRef.current?.focus()
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
          ref={textareaRef}
          value={draft}
          disabled={disabled}
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
            type="button"
            variant="default"
            size="sm"
            disabled={disabled || pending || !draft.trim()}
            onMouseDown={(event) => event.preventDefault()}
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

function ChatThreadShell({
  peer,
  peerProfileHref,
  showBack,
  backHref,
  children,
  composer,
}: {
  peer: {
    login: string
    display_name: string | null
    avatar_url: string | null
    is_online?: boolean
  }
  peerProfileHref?: string
  showBack?: boolean
  backHref?: string
  children: ReactNode
  composer: ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        {showBack && backHref ? (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            render={<Link to={backHref} />}
          >
            <ArrowLeft />
            <span className="sr-only">Retour</span>
          </Button>
        ) : null}
        {peerProfileHref ? (
          <Link
            to={peerProfileHref}
            aria-label={`Profil de ${peer.display_name ?? peer.login}`}
            className="rounded-full outline-none hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Avatar>
              <AvatarImage
                src={resolveMediaUrl(peer.avatar_url)}
                alt={`Photo de ${peer.login}`}
              />
              <AvatarFallback>
                {getInitials(peer.display_name ?? peer.login)}
              </AvatarFallback>
            </Avatar>
          </Link>
        ) : (
          <Avatar>
            <AvatarImage
              src={resolveMediaUrl(peer.avatar_url)}
              alt={`Photo de ${peer.login}`}
            />
            <AvatarFallback>
              {getInitials(peer.display_name ?? peer.login)}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">
              {peer.display_name ?? peer.login}
            </p>
            {peer.is_online ? <Badge variant="secondary">En ligne</Badge> : null}
          </div>
          <p className="truncate text-sm text-muted-foreground">@{peer.login}</p>
        </div>
      </header>

      <MessageScrollerProvider autoScroll>
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="gap-4 p-4">
              {children}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      {composer}
    </div>
  )
}

function ChatThread({
  conversationId,
  currentUserId,
  me,
}: {
  conversationId: number
  currentUserId: number
  me: {
    login: string
    display_name: string | null
    avatar_url: string | null
  }
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
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          className="max-w-md"
          icon={MessageCircle}
          title="Conversation introuvable"
          description={loadError ?? "Cette conversation n’existe pas ou n’est plus accessible."}
        >
          <Button variant="outline" onClick={() => navigate("/conversations")}>
            Retour aux conversations
          </Button>
        </EmptyState>
      </div>
    )
  }

  const peer = conversation.peer

  return (
    <ChatThreadShell
      peer={peer}
      showBack
      backHref="/conversations"
      peerProfileHref={`/profile/${encodeURIComponent(peer.login)}`}
      composer={(
        <ChatComposer
          disabled={false}
          pending={sendRequest.isPending}
          error={sendError}
          onSend={(body) => sendRequest.mutate(body)}
        />
      )}
    >
      <ChatMessageList
        messages={messages}
        currentUserId={currentUserId}
        peer={peer}
        me={me}
        peerLastReadMessageId={conversation.peer_last_read_message_id}
      />
    </ChatThreadShell>
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
      <div className="flex w-full flex-1 items-center justify-center p-6">
        <EmptyState
          className="max-w-md"
          icon={MessageCircle}
          title="Aucune conversation sélectionnée"
          description="Choisis une conversation à gauche, ou ouvre le profil d’un ami BetterIntra pour démarrer un DM."
        />
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
        <EmptyState
          className="max-w-md"
          icon={MessageCircle}
          title="Nouveau thread"
          description="Envoie un premier message pour créer la conversation."
        />
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

function ChatPreviewPage() {
  const peer = chatPreviewConversation.peer

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden md:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b md:w-80 md:border-r md:border-b-0">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <MessageCircle className="text-muted-foreground" />
          <div>
            <h1 className="font-semibold tracking-tight">Messages</h1>
            <p className="text-xs text-muted-foreground">Preview DEV</p>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
          {chatPreviewConversations.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              active={conversation.id === chatPreviewConversation.id}
              previewHref="/conversations?preview=message"
            />
          ))}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
        <ChatThreadShell
          peer={peer}
          composer={(
            <ChatComposer
              disabled
              pending={false}
              error={null}
              onSend={() => {}}
            />
          )}
        >
          <ChatMessageList
            messages={chatPreviewMessages}
            currentUserId={chatPreviewMe.id}
            peer={peer}
            me={chatPreviewMe}
            peerLastReadMessageId={
              chatPreviewConversation.peer_last_read_message_id
            }
          />
        </ChatThreadShell>
      </div>
    </section>
  )
}

export function ChatPage() {
  const { conversationId: conversationIdParam } = useParams()
  const [searchParams] = useSearchParams()
  const isPreview =
    import.meta.env.DEV && searchParams.get("preview") === "message"

  const conversationId = conversationIdParam
    ? Number.parseInt(conversationIdParam, 10)
    : null
  const hasValidConversationId =
    conversationId != null && Number.isFinite(conversationId)

  const currentUserRequest = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    enabled: !isPreview,
  })
  const isIntraLinked = currentUserRequest.data?.is_intra_linked === true

  const conversationsRequest = useQuery({
    queryKey: conversationsQueryKey,
    queryFn: listConversations,
    enabled: !isPreview && isIntraLinked,
  })

  if (isPreview) {
    return <ChatPreviewPage />
  }

  if (currentUserRequest.isPending) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>
  }

  if (!isIntraLinked || !currentUserRequest.data) {
    return (
      <EmptyState
        className="max-w-xl"
        icon={MessageCircle}
        title="Chat indisponible"
        description="Lie ton compte Intra 42 pour discuter avec d’autres élèves BetterIntra."
      >
        <Button render={<Link to="/dashboard" />}>
          Aller au dashboard
        </Button>
      </EmptyState>
    )
  }

  const conversations = conversationsRequest.data ?? []
  const listError = getApiErrorMessage(conversationsRequest.error)
  const me = {
    login: currentUserRequest.data.login ?? "moi",
    display_name: currentUserRequest.data.display_name,
    avatar_url: currentUserRequest.data.avatar_url,
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden md:flex-row">
      <aside
        className={cn(
          "flex shrink-0 flex-col border-b md:w-80 md:border-r md:border-b-0",
          hasValidConversationId ? "hidden md:flex" : "w-full",
        )}
      >
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <MessageCircle className="text-muted-foreground" />
          <div>
            <h1 className="font-semibold tracking-tight">Messages</h1>
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
              <EmptyState
                icon={MessageCircle}
                title="Aucune conversation"
                description="Ouvre un profil BetterIntra pour écrire."
              />
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
          "flex min-h-0 min-w-0 w-full flex-1 flex-col",
          !hasValidConversationId && "max-md:hidden",
        )}
      >
        {hasValidConversationId ? (
          <ChatThread
            conversationId={conversationId}
            currentUserId={currentUserRequest.data.id}
            me={me}
          />
        ) : (
          <NewChatComposer currentUserId={currentUserRequest.data.id} />
        )}
      </div>
    </section>
  )
}
