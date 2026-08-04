import { useState } from "react";
import type { ApiResult } from "../lib/api";
import { api } from "../lib/api";
import { clearAuth, setTokens } from "../lib/storage";
import { Field, Panel, Result, Row } from "../components/ui";

type Props = {
  onAuthed: () => void;
  onLogout: () => void;
};

export function AuthPanel({ onAuthed, onLogout }: Props) {
  const [email, setEmail] = useState("abbouras@student.42.fr");
  const [password, setPassword] = useState("abbouras42!");
  const [result, setResult] = useState<ApiResult | null>(null);

  async function login() {
    const res = await api<{ access_token: string; refresh_token: string }>("/auth/login", {
      auth: false,
      body: { email, password },
    });
    setResult(res);
    if (res.ok && res.data) {
      setTokens(res.data.access_token, res.data.refresh_token);
      onAuthed();
    }
  }

  async function register() {
    const res = await api<{ access_token: string; refresh_token: string }>("/auth/register", {
      auth: false,
      body: { email, password },
    });
    setResult(res);
    if (res.ok && res.data) {
      setTokens(res.data.access_token, res.data.refresh_token);
      onAuthed();
    }
  }

  async function me() {
    setResult(await api("/auth/me"));
  }

  async function refresh() {
    const refresh_token = localStorage.getItem("bi_lab_refresh");
    const res = await api<{ access_token: string; refresh_token: string }>("/auth/refresh", {
      auth: false,
      body: { refresh_token },
    });
    setResult(res);
    if (res.ok && res.data) {
      setTokens(res.data.access_token, res.data.refresh_token);
      onAuthed();
    }
  }

  async function start42() {
    const res = await api<{ authorize_url: string }>("/auth/42");
    setResult(res);
    if (res.ok && res.data?.authorize_url) {
      window.open(res.data.authorize_url, "_blank", "noopener,noreferrer");
    }
  }

  function logout() {
    clearAuth();
    onLogout();
    setResult({ ok: true, status: 200, data: { logged_out: true }, raw: "" });
  }

  return (
    <Panel title="Auth" hint="Email/password JWT · refresh · link Intra 42">
      <Row>
        <Field label="Email">
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <button className="action primary" onClick={login}>
          Login
        </button>
        <button className="action" onClick={register}>
          Register
        </button>
        <button className="action" onClick={me}>
          GET /auth/me
        </button>
        <button className="action" onClick={refresh}>
          Refresh token
        </button>
        <button className="action" onClick={start42}>
          Link Intra 42
        </button>
        <button className="action danger" onClick={logout}>
          Logout
        </button>
      </Row>
      <Result result={result} />
    </Panel>
  );
}
