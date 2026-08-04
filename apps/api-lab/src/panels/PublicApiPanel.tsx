import { useState } from "react";
import type { ApiResult } from "../lib/api";
import { api } from "../lib/api";
import {
  getStoredApiKey,
  setStoredApiKey,
} from "../lib/storage";
import { Field, Panel, Result, Row } from "../components/ui";

function isoInHours(hours: number): string {
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

export function PublicApiPanel() {
  const [name, setName] = useState("lab-key");
  const [apiKey, setApiKey] = useState(getStoredApiKey() ?? "");
  const [keyId, setKeyId] = useState("");
  const [eventId, setEventId] = useState("");
  const [title, setTitle] = useState("Public API event");
  const [result, setResult] = useState<ApiResult | null>(null);

  function rememberKey(value: string) {
    setApiKey(value);
    setStoredApiKey(value || null);
  }

  return (
    <Panel title="Public API + API keys" hint="X-API-Key on /api/v1/events · rate limited">
      <Row>
        <Field label="Key name">
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <button
          className="action primary"
          onClick={async () => {
            const res = await api<{ id: number; key: string }>("/api-keys", {
              method: "POST",
              body: { name },
            });
            setResult(res);
            if (res.ok && res.data) {
              setKeyId(String(res.data.id));
              if (res.data.key) rememberKey(res.data.key);
            }
          }}
        >
          Create API key
        </button>
        <button className="action" onClick={async () => setResult(await api("/api-keys"))}>
          List keys
        </button>
        <Field label="Key id to revoke">
          <input value={keyId} onChange={(e) => setKeyId(e.target.value)} />
        </Field>
        <button
          className="action danger"
          onClick={async () =>
            setResult(await api(`/api-keys/${encodeURIComponent(keyId)}`, { method: "DELETE" }))
          }
        >
          Revoke
        </button>
      </Row>
      <Row>
        <Field label="Raw API key (shown once at create)">
          <input value={apiKey} onChange={(e) => rememberKey(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <button
          className="action"
          onClick={async () =>
            setResult(await api("/api/v1/events", { auth: false, apiKey, query: { limit: 20 } }))
          }
        >
          GET /api/v1/events
        </button>
        <button
          className="action"
          onClick={async () => {
            const res = await api("/api/v1/events", {
              auth: false,
              apiKey,
              method: "POST",
              body: {
                title,
                description: "from public API",
                location: "Lab",
                begin_at: isoInHours(48),
                end_at: isoInHours(50),
              },
            });
            setResult(res);
            if (res.data && typeof res.data === "object" && "id" in res.data) {
              setEventId(String((res.data as { id: number }).id));
            }
          }}
        >
          POST event
        </button>
        <Field label="Public event id">
          <input value={eventId} onChange={(e) => setEventId(e.target.value)} />
        </Field>
        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <button
          className="action"
          onClick={async () =>
            setResult(
              await api(`/api/v1/events/${encodeURIComponent(eventId)}`, { auth: false, apiKey }),
            )
          }
        >
          GET one
        </button>
        <button
          className="action"
          onClick={async () =>
            setResult(
              await api(`/api/v1/events/${encodeURIComponent(eventId)}`, {
                auth: false,
                apiKey,
                method: "PUT",
                body: {
                  title: `${title} (put)`,
                  description: "updated",
                  location: "Lab",
                  begin_at: isoInHours(48),
                  end_at: isoInHours(50),
                },
              }),
            )
          }
        >
          PUT
        </button>
        <button
          className="action danger"
          onClick={async () =>
            setResult(
              await api(`/api/v1/events/${encodeURIComponent(eventId)}`, {
                auth: false,
                apiKey,
                method: "DELETE",
              }),
            )
          }
        >
          DELETE
        </button>
      </Row>
      <Result result={result} />
    </Panel>
  );
}
