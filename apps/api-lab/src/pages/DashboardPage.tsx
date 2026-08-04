import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { Badge, Card, Empty, IntraGate, PageHeader, Spinner } from "../components/ui";

type IntraMe = {
  login?: string;
  displayname?: string;
  wallet?: number;
  correction_point?: number;
  cursus?: Array<{ level?: number; grade?: string; name?: string }>;
};

type Agenda = { items: Array<{ id: string; title: string; begin_at: string; source: string }> };
type Notifs = { items: Array<{ id: number; type: string; body: string; created_at: string }> };

export function DashboardPage() {
  const { user } = useAuth();
  const [intra, setIntra] = useState<IntraMe | null>(null);
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [notifs, setNotifs] = useState<Notifs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.is_intra_linked) {
      setLoading(false);
      return;
    }
    (async () => {
      const [a, b, c] = await Promise.all([
        api<IntraMe>("/me/intra"),
        api<Agenda>("/events", { query: { limit: 5 } }),
        api<Notifs>("/notifications", { query: { limit: 5 } }),
      ]);
      if (a.ok) setIntra(a.data);
      if (b.ok) setAgenda(b.data);
      if (c.ok) setNotifs(c.data);
      setLoading(false);
    })();
  }, [user]);

  const cursus = intra?.cursus?.[0];

  return (
    <div>
      <PageHeader
        title={`Salut${user?.display_name || user?.login ? `, ${user.display_name || user.login}` : ""}`}
        subtitle="Synthèse campus + BetterIntra"
      />

      <IntraGate linked={Boolean(user?.is_intra_linked)}>
        {loading ? (
          <Spinner />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Niveau</p>
              <p className="mt-2 font-display text-4xl font-bold text-teal">
                {cursus?.level?.toFixed?.(2) ?? "—"}
              </p>
              <p className="mt-1 text-sm text-muted">{cursus?.name ?? cursus?.grade ?? ""}</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Wallet</p>
              <p className="mt-2 font-display text-4xl font-bold">{intra?.wallet ?? "—"}</p>
              <p className="mt-1 text-sm text-muted">points correction · {intra?.correction_point ?? "—"}</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Compte</p>
              <p className="mt-2 font-display text-2xl font-bold">{intra?.login}</p>
              <div className="mt-2">
                <Badge tone="ok">Intra lié</Badge>
              </div>
            </Card>

            <Card className="md:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">Prochains events</h2>
                <Link to="/agenda" className="text-sm font-semibold text-teal">
                  Voir agenda
                </Link>
              </div>
              {!agenda?.items?.length ? (
                <Empty title="Rien de prévu" hint="Crée un event BetterIntra ou attend le campus." />
              ) : (
                <ul className="space-y-2">
                  {agenda.items.map((ev) => (
                    <li
                      key={ev.id}
                      className="flex items-center justify-between rounded-xl border border-line/70 bg-paper/60 px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-semibold">{ev.title}</p>
                        <p className="text-xs text-muted">{new Date(ev.begin_at).toLocaleString()}</p>
                      </div>
                      <Badge>{ev.source}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">Notifs</h2>
                <Link to="/notifications" className="text-sm font-semibold text-teal">
                  Tout
                </Link>
              </div>
              {!notifs?.items?.length ? (
                <Empty title="Inbox vide" />
              ) : (
                <ul className="space-y-2">
                  {notifs.items.map((n) => (
                    <li key={n.id} className="rounded-xl bg-fog/80 px-3 py-2">
                      <p className="text-xs font-semibold uppercase text-teal">{n.type}</p>
                      <p className="text-sm">{n.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </IntraGate>
    </div>
  );
}
