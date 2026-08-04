import { useState } from "react";
import type { ApiResult } from "../lib/api";
import { api } from "../lib/api";
import { Field, Panel, Result, Row } from "../components/ui";
import { useLabSocket } from "../lib/ws";

export function ChatPanel() {
  const [toLogin, setToLogin] = useState("dmpeer");
  const [body, setBody] = useState("hello from api-lab");
  const [conversationId, setConversationId] = useState("");
  const [blockLogin, setBlockLogin] = useState("dmpeer");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [wsOn, setWsOn] = useState(false);
  const { connected, events, connect, disconnect, clear } = useLabSocket(wsOn);

  return (
    <>
      <Panel title="Chat DM" hint="1-to-1 · last-read · blocks · Intra-linked only">
        <Row>
          <button className="action" onClick={async () => setResult(await api("/conversations"))}>
            List conversations
          </button>
          <Field label="Conversation id">
            <input value={conversationId} onChange={(e) => setConversationId(e.target.value)} />
          </Field>
          <button
            className="action"
            onClick={async () =>
              setResult(await api(`/conversations/${encodeURIComponent(conversationId)}`))
            }
          >
            Get conversation
          </button>
          <button
            className="action"
            onClick={async () =>
              setResult(
                await api(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
                  query: { limit: 30 },
                }),
              )
            }
          >
            Messages
          </button>
          <button
            className="action"
            onClick={async () =>
              setResult(
                await api(`/conversations/${encodeURIComponent(conversationId)}/read`, {
                  method: "POST",
                  body: {},
                }),
              )
            }
          >
            Mark read
          </button>
        </Row>
        <Row>
          <Field label="To login">
            <input value={toLogin} onChange={(e) => setToLogin(e.target.value)} />
          </Field>
          <Field label="Message">
            <input value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
          <button
            className="action primary"
            onClick={async () => {
              const res = await api("/messages", { body: { to_login: toLogin, body } });
              setResult(res);
              const cid =
                res.data && typeof res.data === "object" && "conversation_id" in res.data
                  ? String((res.data as { conversation_id: number }).conversation_id)
                  : "";
              if (cid) setConversationId(cid);
            }}
          >
            Send DM
          </button>
        </Row>
        <Row>
          <Field label="Block login">
            <input value={blockLogin} onChange={(e) => setBlockLogin(e.target.value)} />
          </Field>
          <button className="action" onClick={async () => setResult(await api("/blocks"))}>
            List blocks
          </button>
          <button
            className="action danger"
            onClick={async () =>
              setResult(await api(`/blocks/${encodeURIComponent(blockLogin)}`, { method: "POST" }))
            }
          >
            Block
          </button>
          <button
            className="action"
            onClick={async () =>
              setResult(
                await api(`/blocks/${encodeURIComponent(blockLogin)}`, { method: "DELETE" }),
              )
            }
          >
            Unblock
          </button>
        </Row>
        <Result result={result} />
      </Panel>

      <Panel
        title="WebSocket"
        hint="presence.* · message.created · conversation.read · notification.created"
      >
        <Row>
          <span className={`badge ${connected ? "on" : ""}`}>
            <span className="dot" />
            {connected ? "WS connected" : "WS disconnected"}
          </span>
          <button
            className="action primary"
            onClick={() => {
              setWsOn(true);
              connect();
            }}
          >
            Connect /ws
          </button>
          <button
            className="action"
            onClick={() => {
              setWsOn(false);
              disconnect();
            }}
          >
            Disconnect
          </button>
          <button className="action" onClick={clear}>
            Clear log
          </button>
        </Row>
        <div className="ws-log">
          {events.length === 0 ? <p className="hint">No events yet.</p> : null}
          {events.map((ev, i) => (
            <div className="ws-item" key={`${ev.at}-${i}`}>
              <div>
                <strong>{ev.type}</strong> · <span>{ev.at}</span>
              </div>
              <pre style={{ margin: "0.25rem 0 0", whiteSpace: "pre-wrap" }}>
                {JSON.stringify(ev.payload, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
