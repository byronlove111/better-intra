import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Input,
  IntraGate,
  PageHeader,
  Spinner,
} from "../components/ui";

type Friend = {
  login: string;
  display_name?: string | null;
  avatar_url?: string | null;
  is_betterintra_linked: boolean;
  is_online?: boolean | null;
  bio?: string | null;
};

type Presence = { online: Array<{ id: number; login: string; display_name?: string | null }> };

export function FriendsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"following" | "followers">("following");
  const [following, setFollowing] = useState<Friend[]>([]);
  const [followers, setFollowers] = useState<Friend[]>([]);
  const [presence, setPresence] = useState<Presence | null>(null);
  const [login, setLogin] = useState("");
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    const [a, b, c] = await Promise.all([
      api<{ items: Friend[] }>("/friends/following"),
      api<{ items: Friend[] }>("/friends/followers"),
      api<Presence>("/presence"),
    ]);
    if (a.ok) setFollowing(a.data?.items ?? []);
    if (b.ok) setFollowers(b.data?.items ?? []);
    if (c.ok) setPresence(c.data);
    setLoading(false);
  }

  useEffect(() => {
    if (!user?.is_intra_linked) {
      setLoading(false);
      return;
    }
    reload();
  }, [user]);

  async function follow(e: FormEvent) {
    e.preventDefault();
    if (!login.trim()) return;
    await api(`/friends/${encodeURIComponent(login.trim())}`, { method: "POST" });
    setLogin("");
    await reload();
  }

  async function unfollow(target: string) {
    await api(`/friends/${encodeURIComponent(target)}`, { method: "DELETE" });
    await reload();
  }

  const list = tab === "following" ? following : followers;

  return (
    <div>
      <PageHeader title="Amis" subtitle="Follows Intra-first · présence live" />
      <IntraGate linked={Boolean(user?.is_intra_linked)}>
        <form className="mb-4 flex flex-wrap gap-2" onSubmit={follow}>
          <Input
            placeholder="Login 42 à follow"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="max-w-xs"
          />
          <Button type="submit">Follow</Button>
        </form>

        {presence?.online?.length ? (
          <Card className="mb-4 !py-4">
            <p className="mb-2 text-xs font-semibold uppercase text-muted">En ligne (follows)</p>
            <div className="flex flex-wrap gap-2">
              {presence.online.map((p) => (
                <Link
                  key={p.id}
                  to={`/profile/${p.login}`}
                  className="inline-flex items-center gap-2 rounded-full bg-online/10 px-3 py-1.5 text-sm font-semibold text-online"
                >
                  <span className="h-2 w-2 rounded-full bg-online" />
                  {p.display_name || p.login}
                </Link>
              ))}
            </div>
          </Card>
        ) : null}

        <div className="mb-4 flex gap-2 rounded-xl bg-fog p-1 w-fit">
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "following" ? "bg-card shadow-sm" : "text-muted"}`}
            onClick={() => setTab("following")}
          >
            Following ({following.length})
          </button>
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "followers" ? "bg-card shadow-sm" : "text-muted"}`}
            onClick={() => setTab("followers")}
          >
            Followers ({followers.length})
          </button>
        </div>

        {loading ? (
          <Spinner />
        ) : !list.length ? (
          <Empty title="Liste vide" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((f) => (
              <Card key={f.login} className="flex items-center gap-3 !py-4">
                <Avatar src={f.avatar_url} name={f.display_name || f.login} />
                <div className="min-w-0 flex-1">
                  <Link to={`/profile/${f.login}`} className="font-semibold hover:text-teal">
                    {f.display_name || f.login}
                  </Link>
                  <p className="truncate text-xs text-muted">@{f.login}</p>
                  <div className="mt-1 flex gap-1">
                    {f.is_betterintra_linked ? <Badge tone="ok">BI</Badge> : <Badge>Intra</Badge>}
                    {f.is_online === true ? <Badge tone="ok">online</Badge> : null}
                  </div>
                </div>
                {tab === "following" ? (
                  <Button variant="ghost" onClick={() => unfollow(f.login)}>
                    Unfollow
                  </Button>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </IntraGate>
    </div>
  );
}
