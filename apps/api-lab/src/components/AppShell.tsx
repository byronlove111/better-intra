import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Avatar, Button, cn } from "./ui";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useSocket } from "../lib/ws";

const NAV = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/profile", label: "Profil" },
  { to: "/projects", label: "Projets" },
  { to: "/agenda", label: "Agenda" },
  { to: "/evaluations", label: "Évaluations" },
  { to: "/logtime", label: "Logtime" },
  { to: "/friends", label: "Amis" },
  { to: "/chat", label: "Chat" },
  { to: "/notifications", label: "Notifs" },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const [notifCount, setNotifCount] = useState(0);
  const { connected } = useSocket();

  useEffect(() => {
    if (!user?.is_intra_linked) return;
    (async () => {
      const res = await api<{ items: unknown[] }>("/notifications", { query: { limit: 20 } });
      if (res.ok && res.data?.items) setNotifCount(res.data.items.length);
    })();
  }, [user]);

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-5 md:px-6">
      <aside className="sticky top-5 hidden h-[calc(100vh-2.5rem)] w-60 shrink-0 flex-col rounded-3xl border border-line/70 bg-card/85 p-4 shadow-[0_18px_50px_-30px_rgba(11,26,28,0.45)] backdrop-blur md:flex">
        <div className="mb-6 px-2">
          <p className="font-display text-2xl font-extrabold tracking-tight text-ink">
            Better<span className="text-teal">Intra</span>
          </p>
          <p className="mt-1 text-xs text-muted">Campus, social, live</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  isActive ? "bg-teal text-white" : "text-ink-soft hover:bg-mist/70",
                )
              }
            >
              {item.label}
              {item.to === "/notifications" && notifCount > 0 ? (
                <span className="ml-2 rounded-full bg-coral/20 px-1.5 text-[10px] text-coral">
                  {notifCount}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 border-t border-line pt-4">
          <div className="mb-3 flex items-center gap-3 px-1">
            <Avatar src={user?.avatar_url} name={user?.display_name || user?.login || user?.email} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {user?.display_name || user?.login || "Compte"}
              </p>
              <p className="truncate text-xs text-muted">{user?.email}</p>
            </div>
          </div>
          <div className="mb-2 flex items-center gap-2 px-1 text-xs text-muted">
            <span className={cn("h-2 w-2 rounded-full", connected ? "bg-online" : "bg-line")} />
            {connected ? "Temps réel" : "Hors ligne WS"}
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={logout}>
            Se déconnecter
          </Button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-20 md:pb-6">
        <header className="mb-5 flex items-center justify-between rounded-2xl border border-line/70 bg-card/70 px-4 py-3 backdrop-blur md:hidden">
          <p className="font-display text-lg font-bold">
            Better<span className="text-teal">Intra</span>
          </p>
          <Button variant="ghost" onClick={logout}>
            Out
          </Button>
        </header>
        <Outlet />
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex gap-1 overflow-x-auto border-t border-line bg-card/95 px-2 py-2 backdrop-blur md:hidden">
        {NAV.slice(0, 6).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "shrink-0 rounded-lg px-3 py-2 text-xs font-semibold",
                isActive ? "bg-teal text-white" : "text-muted",
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
