import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { api, apiBlob, downloadBlob } from "../lib/api";
import { Badge, Button, Card, Empty, IntraGate, PageHeader, Spinner } from "../components/ui";

type EvalItem = {
  id?: number;
  role?: string;
  final_mark?: number | null;
  project_name?: string | null;
  begin_at?: string | null;
  corrector_login?: string | null;
};

type Analytics = {
  total_hours?: number;
  active_days?: number;
  by_weekday?: Array<{ weekday_name: string; duration_hours: number }>;
};

export function EvaluationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<EvalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.is_intra_linked) {
      setLoading(false);
      return;
    }
    (async () => {
      const res = await api<{ items: EvalItem[] }>("/me/intra/evaluations");
      if (res.ok) setItems(res.data?.items ?? []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div>
      <PageHeader title="Évaluations" subtitle="Historique correcteur / corrigé" />
      <IntraGate linked={Boolean(user?.is_intra_linked)}>
        {loading ? (
          <Spinner />
        ) : !items.length ? (
          <Empty title="Aucune évaluation" />
        ) : (
          <div className="space-y-3">
            {items.map((ev, i) => (
              <Card key={ev.id ?? i} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{ev.project_name ?? "Éval"}</p>
                  <p className="text-xs text-muted">
                    {ev.begin_at ? new Date(ev.begin_at).toLocaleString() : "—"}
                    {ev.role ? ` · ${ev.role}` : ""}
                    {ev.corrector_login ? ` · by ${ev.corrector_login}` : ""}
                  </p>
                </div>
                <span className="font-display text-2xl font-bold text-teal">{ev.final_mark ?? "—"}</span>
              </Card>
            ))}
          </div>
        )}
      </IntraGate>
    </div>
  );
}

export function LogtimePage() {
  const { user } = useAuth();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.is_intra_linked) {
      setLoading(false);
      return;
    }
    (async () => {
      const res = await api<Analytics>("/analytics/logtime");
      if (res.ok) setData(res.data);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div>
      <PageHeader
        title="Logtime"
        subtitle="Heures à l’école + exports"
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                const res = await apiBlob("/analytics/logtime/export.csv");
                if (res.ok && res.data) downloadBlob(res.data, "logtime.csv");
              }}
            >
              CSV
            </Button>
            <Button
              onClick={async () => {
                const res = await apiBlob("/analytics/logtime/export.pdf");
                if (res.ok && res.data) downloadBlob(res.data, "logtime.pdf");
              }}
            >
              PDF
            </Button>
          </div>
        }
      />
      <IntraGate linked={Boolean(user?.is_intra_linked)}>
        {loading ? (
          <Spinner />
        ) : !data ? (
          <Empty title="Pas de data" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <p className="text-xs font-semibold uppercase text-muted">Total heures</p>
              <p className="mt-2 font-display text-5xl font-bold text-teal">
                {Number(data.total_hours ?? 0).toFixed(1)}
              </p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase text-muted">Jours actifs</p>
              <p className="mt-2 font-display text-5xl font-bold">{data.active_days ?? 0}</p>
            </Card>
            <Card className="md:col-span-2">
              <h3 className="font-display text-lg font-bold">Par jour de semaine</h3>
              <div className="mt-4 grid grid-cols-7 gap-2">
                {(data.by_weekday ?? []).map((d) => (
                  <div key={d.weekday_name} className="rounded-xl bg-fog px-2 py-3 text-center">
                    <p className="text-[10px] font-semibold uppercase text-muted">
                      {d.weekday_name.slice(0, 3)}
                    </p>
                    <p className="mt-1 font-display text-lg font-bold">
                      {Number(d.duration_hours).toFixed(1)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </IntraGate>
    </div>
  );
}

export function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Array<{ id: number; type: string; body: string; url?: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.is_intra_linked) {
      setLoading(false);
      return;
    }
    (async () => {
      const res = await api<{ items: typeof items }>("/notifications", { query: { limit: 50 } });
      if (res.ok) setItems(res.data?.items ?? []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Inbox simple · purge 7 jours" />
      <IntraGate linked={Boolean(user?.is_intra_linked)}>
        {loading ? (
          <Spinner />
        ) : !items.length ? (
          <Empty title="Aucune notification" />
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <Card key={n.id} className="!py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge tone="ok">{n.type}</Badge>
                    <p className="mt-2 text-sm">{n.body}</p>
                    {n.url ? (
                      <a href={n.url} className="mt-1 inline-block text-xs font-semibold text-teal">
                        Ouvrir
                      </a>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-xs text-muted">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </IntraGate>
    </div>
  );
}
