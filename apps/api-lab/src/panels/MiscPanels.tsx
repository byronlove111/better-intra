import { useState } from "react";
import type { ApiResult } from "../lib/api";
import { api, apiBlob, downloadBlob } from "../lib/api";
import { Field, Panel, Result, Row } from "../components/ui";

export function AnalyticsPanel() {
  const [result, setResult] = useState<ApiResult | null>(null);

  return (
    <Panel title="Analytics logtime" hint="JSON + CSV/PDF export">
      <Row>
        <button
          className="action primary"
          onClick={async () => setResult(await api("/analytics/logtime"))}
        >
          GET /analytics/logtime
        </button>
        <button
          className="action"
          onClick={async () => {
            const res = await apiBlob("/analytics/logtime/export.csv");
            setResult({ ...res, data: res.raw } as ApiResult);
            if (res.ok && res.data) downloadBlob(res.data, "logtime.csv");
          }}
        >
          Export CSV
        </button>
        <button
          className="action"
          onClick={async () => {
            const res = await apiBlob("/analytics/logtime/export.pdf");
            setResult({ ...res, data: res.raw } as ApiResult);
            if (res.ok && res.data) downloadBlob(res.data, "logtime.pdf");
          }}
        >
          Export PDF
        </button>
      </Row>
      <Field label="Optional begin/end are server defaults if omitted">
        <span />
      </Field>
      <Result result={result} />
    </Panel>
  );
}

export function NotificationsPanel() {
  const [result, setResult] = useState<ApiResult | null>(null);
  return (
    <Panel title="Notifications" hint="Simple inbox · 7-day TTL · WS push">
      <Row>
        <button
          className="action primary"
          onClick={async () => setResult(await api("/notifications", { query: { limit: 50 } }))}
        >
          GET /notifications
        </button>
      </Row>
      <Result result={result} />
    </Panel>
  );
}

export function HealthPanel() {
  const [result, setResult] = useState<ApiResult | null>(null);
  return (
    <Panel title="Health">
      <Row>
        <button
          className="action"
          onClick={async () => setResult(await api("/health", { auth: false }))}
        >
          /health
        </button>
        <button
          className="action"
          onClick={async () => setResult(await api("/health/db", { auth: false }))}
        >
          /health/db
        </button>
      </Row>
      <Result result={result} />
    </Panel>
  );
}
