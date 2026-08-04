import { type FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button, Card, ErrorBox, Input, Spinner } from "../components/ui";

export function LoginPage() {
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("abbouras@student.42.fr");
  const [password, setPassword] = useState("abbouras42!");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner />;
  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = mode === "login" ? await login(email, password) : await register(email, password);
    setBusy(false);
    if (err) setError(err);
    else navigate("/");
  }

  return (
    <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2">
      <section className="relative overflow-hidden rounded-[2rem] border border-line/60 bg-ink px-8 py-12 text-paper shadow-[0_30px_80px_-40px_rgba(11,26,28,0.7)] lg:min-h-[34rem]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_280px_at_20%_20%,rgba(20,184,166,0.35),transparent_60%),radial-gradient(500px_260px_at_90%_80%,rgba(224,122,95,0.25),transparent_55%)]" />
        <div className="relative">
          <p className="font-display text-5xl font-extrabold tracking-tight md:text-6xl">
            BetterIntra
          </p>
          <p className="mt-4 max-w-md text-lg text-paper/80">
            L’Intra moderne : data 42 en lecture, social et agenda chez nous.
          </p>
          <ul className="mt-8 space-y-2 text-sm text-paper/70">
            <li>Profil unifié · amis · présence live</li>
            <li>Chat DM · notifications · events BetterIntra</li>
            <li>Analytics logtime + export PDF/CSV</li>
          </ul>
        </div>
      </section>

      <Card className="mx-auto w-full max-w-md">
        <div className="mb-6 flex gap-2 rounded-xl bg-fog p-1">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === "login" ? "bg-card shadow-sm" : "text-muted"}`}
            onClick={() => setMode("login")}
          >
            Connexion
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === "register" ? "bg-card shadow-sm" : "text-muted"}`}
            onClick={() => setMode("register")}
          >
            Inscription
          </button>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
              Email
            </label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
              Mot de passe
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {error ? <ErrorBox message={error} /> : null}
          <Button className="w-full" disabled={busy}>
            {busy ? "…" : mode === "login" ? "Entrer" : "Créer mon compte"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
