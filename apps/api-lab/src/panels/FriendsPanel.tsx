import { useState } from "react";
import type { ApiResult } from "../lib/api";
import { api } from "../lib/api";
import { Field, Panel, Result, Row } from "../components/ui";

export function FriendsPanel() {
  const [login, setLogin] = useState("dmpeer");
  const [result, setResult] = useState<ApiResult | null>(null);

  return (
    <Panel title="Friends (follows)" hint="Follow any Intra login · online flag when BI-linked">
      <Row>
        <button className="action" onClick={async () => setResult(await api("/friends/following"))}>
          My following
        </button>
        <button className="action" onClick={async () => setResult(await api("/friends/followers"))}>
          My followers
        </button>
        <button className="action" onClick={async () => setResult(await api("/friends/stats"))}>
          My stats
        </button>
        <button className="action" onClick={async () => setResult(await api("/presence"))}>
          Presence (follows online)
        </button>
      </Row>
      <Row>
        <Field label="Login">
          <input value={login} onChange={(e) => setLogin(e.target.value)} />
        </Field>
        <button
          className="action primary"
          onClick={async () =>
            setResult(await api(`/friends/${encodeURIComponent(login)}`, { method: "POST" }))
          }
        >
          Follow
        </button>
        <button
          className="action danger"
          onClick={async () =>
            setResult(await api(`/friends/${encodeURIComponent(login)}`, { method: "DELETE" }))
          }
        >
          Unfollow
        </button>
        <button
          className="action"
          onClick={async () => setResult(await api(`/friends/${encodeURIComponent(login)}/stats`))}
        >
          Stats
        </button>
        <button
          className="action"
          onClick={async () =>
            setResult(await api(`/friends/${encodeURIComponent(login)}/following`))
          }
        >
          Their following
        </button>
        <button
          className="action"
          onClick={async () =>
            setResult(await api(`/friends/${encodeURIComponent(login)}/followers`))
          }
        >
          Their followers
        </button>
      </Row>
      <Result result={result} />
    </Panel>
  );
}
