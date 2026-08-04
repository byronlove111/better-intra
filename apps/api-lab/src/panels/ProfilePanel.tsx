import { useState } from "react";
import type { ApiResult } from "../lib/api";
import { api } from "../lib/api";
import { Field, Panel, Result, Row } from "../components/ui";

export function ProfilePanel() {
  const [login, setLogin] = useState("abbouras");
  const [bio, setBio] = useState("");
  const [result, setResult] = useState<ApiResult | null>(null);

  return (
    <Panel title="Users / profile" hint="Unified Intra-first profile + bio">
      <Row>
        <button className="action primary" onClick={async () => setResult(await api("/users/me"))}>
          GET /users/me
        </button>
        <Field label="Bio">
          <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="New bio" />
        </Field>
        <button
          className="action"
          onClick={async () => setResult(await api("/users/me", { method: "PATCH", body: { bio } }))}
        >
          PATCH /users/me
        </button>
      </Row>
      <Row>
        <Field label="Login">
          <input value={login} onChange={(e) => setLogin(e.target.value)} />
        </Field>
        <button
          className="action"
          onClick={async () => setResult(await api(`/users/${encodeURIComponent(login)}`))}
        >
          GET /users/{"{login}"}
        </button>
      </Row>
      <Result result={result} />
    </Panel>
  );
}
