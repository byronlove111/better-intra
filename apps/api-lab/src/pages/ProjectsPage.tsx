import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { Badge, Card, Empty, IntraGate, PageHeader, Spinner } from "../components/ui";

type Project = {
  id?: number;
  status?: string;
  final_mark?: number | null;
  project_name?: string | null;
  marked_at?: string | null;
};

export function ProjectsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.is_intra_linked) {
      setLoading(false);
      return;
    }
    (async () => {
      const res = await api<{ items: Project[] }>("/me/intra/projects");
      if (res.ok && res.data?.items) setItems(res.data.items);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div>
      <PageHeader title="Projets" subtitle="Statuts et notes Intra" />
      <IntraGate linked={Boolean(user?.is_intra_linked)}>
        {loading ? (
          <Spinner />
        ) : !items.length ? (
          <Empty title="Aucun projet" />
        ) : (
          <div className="grid gap-3">
            {items.map((p, i) => (
              <Card key={p.id ?? i} className="flex flex-wrap items-center justify-between gap-3 !py-4">
                <div>
                  <p className="font-semibold">{p.project_name ?? "Projet"}</p>
                  <p className="text-xs text-muted">{p.marked_at ? new Date(p.marked_at).toLocaleDateString() : "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{p.status ?? "—"}</Badge>
                  <span className="font-display text-xl font-bold text-teal">
                    {p.final_mark ?? "—"}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </IntraGate>
    </div>
  );
}
