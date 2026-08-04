import { type FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  Input,
  IntraGate,
  PageHeader,
  Spinner,
  Textarea,
} from "../components/ui";

type Profile = {
  login?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  is_betterintra_linked?: boolean;
  is_online?: boolean | null;
  intra?: {
    wallet?: number;
    correction_point?: number;
    campus?: Array<{ name?: string }>;
    cursus?: Array<{ level?: number; name?: string }>;
  } | null;
};

export function ProfilePage() {
  const { login: routeLogin } = useParams();
  const { user, refreshMe } = useAuth();
  const navigate = useNavigate();
  const [lookup, setLookup] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isMe = !routeLogin;

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const path = isMe ? "/users/me" : `/users/${encodeURIComponent(routeLogin!)}`;
      const res = await api<Profile>(path);
      if (!res.ok) setError(res.error ?? "Erreur");
      else {
        setProfile(res.data);
        setBio(res.data?.bio ?? "");
      }
      setLoading(false);
    })();
  }, [routeLogin, isMe]);

  async function saveBio(e: FormEvent) {
    e.preventDefault();
    const res = await api<Profile>("/users/me", { method: "PATCH", body: { bio } });
    if (!res.ok) setError(res.error ?? "Erreur");
    else {
      setProfile(res.data);
      await refreshMe();
    }
  }

  async function follow() {
    if (!profile?.login) return;
    await api(`/friends/${encodeURIComponent(profile.login)}`, { method: "POST" });
  }

  return (
    <div>
      <PageHeader
        title={isMe ? "Mon profil" : `Profil · ${routeLogin}`}
        subtitle="Intra-first + bio BetterIntra"
        action={
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (lookup.trim()) navigate(`/profile/${lookup.trim()}`);
            }}
          >
            <Input
              placeholder="Chercher un login 42"
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
              className="w-44"
            />
            <Button type="submit" variant="secondary">
              Ouvrir
            </Button>
          </form>
        }
      />

      <IntraGate linked={Boolean(user?.is_intra_linked)}>
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorBox message={error} />
        ) : !profile ? (
          <Empty title="Profil introuvable" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <Card className="text-center">
              <div className="mx-auto mb-3 flex justify-center">
                <Avatar src={profile.avatar_url} name={profile.display_name || profile.login} size="lg" />
              </div>
              <h2 className="font-display text-2xl font-bold">{profile.display_name || profile.login}</h2>
              <p className="text-sm text-muted">@{profile.login}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {profile.is_betterintra_linked ? <Badge tone="ok">BetterIntra</Badge> : <Badge>Intra only</Badge>}
                {profile.is_online === true ? <Badge tone="ok">Online</Badge> : null}
                {profile.is_online === false ? <Badge>Offline</Badge> : null}
              </div>
              {!isMe && profile.login ? (
                <div className="mt-4 flex flex-col gap-2">
                  <Button onClick={follow}>Follow</Button>
                  <Button variant="secondary" onClick={() => navigate(`/chat?to=${profile.login}`)}>
                    Message
                  </Button>
                </div>
              ) : null}
            </Card>

            <div className="space-y-4">
              <Card>
                <h3 className="font-display text-lg font-bold">Intra</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Stat label="Niveau" value={profile.intra?.cursus?.[0]?.level?.toFixed?.(2) ?? "—"} />
                  <Stat label="Wallet" value={String(profile.intra?.wallet ?? "—")} />
                  <Stat label="Campus" value={profile.intra?.campus?.[0]?.name ?? "—"} />
                </div>
              </Card>

              <Card>
                <h3 className="font-display text-lg font-bold">Bio BetterIntra</h3>
                {isMe ? (
                  <form className="mt-3 space-y-3" onSubmit={saveBio}>
                    <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} />
                    <Button type="submit">Enregistrer</Button>
                  </form>
                ) : (
                  <p className="mt-3 text-sm text-ink-soft">{profile.bio || "Pas de bio."}</p>
                )}
              </Card>
            </div>
          </div>
        )}
      </IntraGate>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-fog/80 px-3 py-3">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-1 font-display text-xl font-bold">{value}</p>
    </div>
  );
}
