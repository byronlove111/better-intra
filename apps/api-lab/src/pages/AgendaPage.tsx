import { type FormEvent, useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  Input,
  PageHeader,
  Spinner,
  Textarea,
} from "../components/ui";

type AgendaItem = {
  id: string;
  title: string;
  begin_at: string;
  end_at?: string;
  location?: string | null;
  source: string;
  description?: string | null;
};

export function AgendaPage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [beginAt, setBeginAt] = useState("");
  const [endAt, setEndAt] = useState("");

  async function load(search = q) {
    setLoading(true);
    const res = await api<{ items: AgendaItem[] }>("/events", {
      query: { q: search || undefined, limit: 40 },
    });
    if (!res.ok) setError(res.error ?? "Erreur");
    else {
      setError(null);
      setItems(res.data?.items ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function createEvent(e: FormEvent) {
    e.preventDefault();
    const res = await api("/events", {
      method: "POST",
      body: {
        title,
        location: location || null,
        description: description || null,
        begin_at: new Date(beginAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
      },
    });
    if (!res.ok) setError(res.error ?? "Erreur");
    else {
      setTitle("");
      setLocation("");
      setDescription("");
      await load();
    }
  }

  return (
    <div>
      <PageHeader title="Agenda" subtitle="Feed unifié Intra + BetterIntra" />
      <div className="mb-4 flex flex-wrap gap-2">
          <Input
            placeholder="Rechercher…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
          <Button variant="secondary" onClick={() => load()}>
            Filtrer
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div>
            {loading ? (
              <Spinner />
            ) : error ? (
              <ErrorBox message={error} />
            ) : !items.length ? (
              <Empty title="Aucun event" hint="Ajuste les filtres ou crée un event BI." />
            ) : (
              <div className="space-y-3">
                {items.map((ev) => (
                  <Card key={ev.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display text-lg font-bold">{ev.title}</h3>
                        <p className="mt-1 text-sm text-muted">
                          {ev.begin_at ? new Date(ev.begin_at).toLocaleString() : "—"}
                          {ev.location ? ` · ${ev.location}` : ""}
                        </p>
                        {ev.description ? (
                          <p className="mt-2 text-sm text-ink-soft">{ev.description}</p>
                        ) : null}
                      </div>
                      <Badge tone={ev.source === "betterintra" ? "ok" : "neutral"}>{ev.source}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Card>
            <h3 className="font-display text-lg font-bold">Nouvel event BI</h3>
            <form className="mt-3 space-y-3" onSubmit={createEvent}>
              <Input placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <Input
                placeholder="Lieu"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <Textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Input
                type="datetime-local"
                value={beginAt}
                onChange={(e) => setBeginAt(e.target.value)}
                required
              />
              <Input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                required
              />
              <Button type="submit" className="w-full">
                Créer
              </Button>
            </form>
          </Card>
        </div>
    </div>
  );
}
