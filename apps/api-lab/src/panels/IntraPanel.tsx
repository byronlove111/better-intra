import { useState } from "react";
import type { ApiResult } from "../lib/api";
import { api } from "../lib/api";
import { Field, Panel, Result, Row } from "../components/ui";

export function IntraPanel() {
  const [login, setLogin] = useState("abbouras");
  const [q, setQ] = useState("abb");
  const [result, setResult] = useState<ApiResult | null>(null);

  return (
    <Panel title="Intra proxy (read-only)" hint="Requires linked 42 account">
      <Row>
        <button className="action" onClick={async () => setResult(await api("/me/intra"))}>
          /me/intra
        </button>
        <button className="action" onClick={async () => setResult(await api("/me/intra/projects"))}>
          projects
        </button>
        <button className="action" onClick={async () => setResult(await api("/me/intra/events"))}>
          events
        </button>
        <button className="action" onClick={async () => setResult(await api("/me/intra/evaluations"))}>
          evaluations
        </button>
        <button className="action" onClick={async () => setResult(await api("/me/intra/logtime"))}>
          logtime
        </button>
      </Row>
      <Row>
        <Field label="Search q">
          <input value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <button
          className="action primary"
          onClick={async () => setResult(await api("/intra/users", { query: { q, page: 1, page_size: 10 } }))}
        >
          Search users
        </button>
      </Row>
      <Row>
        <Field label="Other login">
          <input value={login} onChange={(e) => setLogin(e.target.value)} />
        </Field>
        <button
          className="action"
          onClick={async () => setResult(await api(`/intra/users/${encodeURIComponent(login)}`))}
        >
          profile
        </button>
        <button
          className="action"
          onClick={async () =>
            setResult(await api(`/intra/users/${encodeURIComponent(login)}/projects`))
          }
        >
          projects
        </button>
        <button
          className="action"
          onClick={async () =>
            setResult(await api(`/intra/users/${encodeURIComponent(login)}/evaluations`))
          }
        >
          evaluations
        </button>
        <button
          className="action"
          onClick={async () =>
            setResult(await api(`/intra/users/${encodeURIComponent(login)}/logtime`))
          }
        >
          logtime
        </button>
      </Row>
      <Result result={result} />
    </Panel>
  );
}
