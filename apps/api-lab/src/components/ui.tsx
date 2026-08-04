import type { ReactNode } from "react";
import type { ApiResult } from "../lib/api";

export function Result({ title, result }: { title?: string; result: ApiResult | null }) {
  if (!result) return null;
  return (
    <div className={`result ${result.ok ? "ok" : "err"}`}>
      <div className="result-meta">
        {title ? <strong>{title}</strong> : null}
        <span>
          HTTP {result.status} · {result.ok ? "OK" : "ERR"}
        </span>
      </div>
      {result.error ? <pre className="err-text">{result.error}</pre> : null}
      <pre>{pretty(result.data ?? result.raw)}</pre>
    </div>
  );
}

function pretty(value: unknown): string {
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="row">{children}</div>;
}

export function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <header>
        <h2>{title}</h2>
        {hint ? <p className="hint">{hint}</p> : null}
      </header>
      {children}
    </section>
  );
}
