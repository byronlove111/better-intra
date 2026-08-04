import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { useSocket } from "../lib/ws";
import {
  Avatar,
  Badge,
  Button,
  Empty,
  Input,
  IntraGate,
  PageHeader,
  Spinner,
} from "../components/ui";

type Peer = {
  id: number;
  login: string;
  display_name?: string | null;
  avatar_url?: string | null;
  is_online?: boolean;
};

type Conversation = {
  id: number;
  peer: Peer;
  last_message?: { body: string; created_at: string } | null;
  unread_count?: number;
};

type Message = {
  id: number;
  conversation_id: number;
  sender_id: number;
  body: string;
  created_at: string;
};

export function ChatPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [toLogin, setToLogin] = useState(params.get("to") ?? "");
  const [loading, setLoading] = useState(true);
  const { events } = useSocket();

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  async function loadConversations() {
    const res = await api<Conversation[]>("/conversations");
    if (res.ok && res.data) {
      setConversations(res.data);
      if (!activeId && res.data[0]) setActiveId(res.data[0].id);
    }
  }

  async function loadMessages(id: number) {
    const res = await api<{ items: Message[] }>(`/conversations/${id}/messages`, {
      query: { limit: 50 },
    });
    if (res.ok) setMessages(res.data?.items ?? []);
    await api(`/conversations/${id}/read`, { method: "POST", body: {} });
  }

  useEffect(() => {
    if (!user?.is_intra_linked) {
      setLoading(false);
      return;
    }
    (async () => {
      await loadConversations();
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
  }, [activeId]);

  useEffect(() => {
    const last = events[0];
    if (!last) return;
    if (last.type === "message.created") {
      loadConversations();
      if (activeId) loadMessages(activeId);
    }
  }, [events, activeId]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const target = active?.peer.login || toLogin;
    if (!target) return;
    const res = await api<Message>("/messages", {
      body: { to_login: target, body: body.trim() },
    });
    if (res.ok && res.data) {
      setBody("");
      await loadConversations();
      setActiveId(res.data.conversation_id);
      await loadMessages(res.data.conversation_id);
    }
  }

  return (
    <div>
      <PageHeader title="Chat" subtitle="DM 1-to-1 · live WebSocket" />
      <IntraGate linked={Boolean(user?.is_intra_linked)}>
        {loading ? (
          <Spinner />
        ) : (
          <div className="grid min-h-[70vh] overflow-hidden rounded-3xl border border-line bg-card/90 shadow-[0_18px_50px_-30px_rgba(11,26,28,0.4)] lg:grid-cols-[280px_1fr]">
            <aside className="border-b border-line lg:border-b-0 lg:border-r">
              <div className="border-b border-line p-3">
                <form className="flex gap-2" onSubmit={send}>
                  <Input
                    placeholder="Login…"
                    value={toLogin}
                    onChange={(e) => setToLogin(e.target.value)}
                  />
                </form>
              </div>
              <div className="max-h-[50vh] overflow-auto lg:max-h-[calc(70vh-58px)]">
                {!conversations.length ? (
                  <p className="p-4 text-sm text-muted">Aucune conversation.</p>
                ) : (
                  conversations.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveId(c.id)}
                      className={`flex w-full items-center gap-3 border-b border-line/60 px-3 py-3 text-left transition hover:bg-fog/80 ${
                        activeId === c.id ? "bg-fog" : ""
                      }`}
                    >
                      <Avatar src={c.peer.avatar_url} name={c.peer.display_name || c.peer.login} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">
                            {c.peer.display_name || c.peer.login}
                          </p>
                          {c.peer.is_online ? <Badge tone="ok">on</Badge> : null}
                        </div>
                        <p className="truncate text-xs text-muted">{c.last_message?.body ?? "—"}</p>
                      </div>
                      {(c.unread_count ?? 0) > 0 ? (
                        <span className="rounded-full bg-coral px-2 text-[10px] font-bold text-white">
                          {c.unread_count}
                        </span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </aside>

            <section className="flex min-h-[50vh] flex-col">
              <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                {active ? (
                  <>
                    <Avatar src={active.peer.avatar_url} name={active.peer.display_name || active.peer.login} />
                    <div>
                      <p className="font-semibold">{active.peer.display_name || active.peer.login}</p>
                      <p className="text-xs text-muted">@{active.peer.login}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted">Choisis une conversation ou envoie à un login</p>
                )}
              </header>

              <div className="flex-1 space-y-2 overflow-auto bg-fog/40 p-4">
                {!messages.length ? (
                  <Empty title="Pas encore de messages" hint="Dis bonjour." />
                ) : (
                  messages.map((m) => {
                    const mine = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                            mine ? "bg-teal text-white" : "bg-card border border-line"
                          }`}
                        >
                          <p>{m.body}</p>
                          <p className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-muted"}`}>
                            {new Date(m.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form className="flex gap-2 border-t border-line p-3" onSubmit={send}>
                <Input
                  placeholder="Écrire un message…"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                <Button type="submit">Envoyer</Button>
              </form>
            </section>
          </div>
        )}
      </IntraGate>
    </div>
  );
}
