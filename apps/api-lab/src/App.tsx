import { useMemo, useState } from "react";
import { AuthPanel } from "./panels/AuthPanel";
import { ProfilePanel } from "./panels/ProfilePanel";
import { IntraPanel } from "./panels/IntraPanel";
import { FriendsPanel } from "./panels/FriendsPanel";
import { ChatPanel } from "./panels/ChatPanel";
import { EventsPanel } from "./panels/EventsPanel";
import { PublicApiPanel } from "./panels/PublicApiPanel";
import { AnalyticsPanel, HealthPanel, NotificationsPanel } from "./panels/MiscPanels";
import { getAccessToken } from "./lib/storage";
import "./styles.css";

const TABS = [
  "Auth",
  "Profile",
  "Intra",
  "Friends",
  "Chat / WS",
  "Events",
  "Public API",
  "Analytics",
  "Notifications",
  "Health",
] as const;

type Tab = (typeof TABS)[number];

export default function App() {
  const [tab, setTab] = useState<Tab>("Auth");
  const [authed, setAuthed] = useState(() => Boolean(getAccessToken()));
  const tokenPreview = useMemo(() => {
    const t = getAccessToken();
    if (!t) return "no token";
    return `${t.slice(0, 12)}…`;
  }, [authed]);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>BetterIntra API Lab</h1>
          <p className="sub">
            Throwaway tester for Malik&apos;s API — not Swan&apos;s product front. Proxied to{" "}
            <code>:8000</code> via Vite.
          </p>
        </div>
        <span className={`badge ${authed ? "on" : ""}`}>
          <span className="dot" />
          {authed ? `JWT ${tokenPreview}` : "Logged out"}
        </span>
      </div>

      <nav className="tabs">
        {TABS.map((name) => (
          <button
            key={name}
            className={tab === name ? "active" : ""}
            onClick={() => setTab(name)}
            type="button"
          >
            {name}
          </button>
        ))}
      </nav>

      {tab === "Auth" && (
        <AuthPanel onAuthed={() => setAuthed(true)} onLogout={() => setAuthed(false)} />
      )}
      {tab === "Profile" && <ProfilePanel />}
      {tab === "Intra" && <IntraPanel />}
      {tab === "Friends" && <FriendsPanel />}
      {tab === "Chat / WS" && <ChatPanel />}
      {tab === "Events" && <EventsPanel />}
      {tab === "Public API" && <PublicApiPanel />}
      {tab === "Analytics" && <AnalyticsPanel />}
      {tab === "Notifications" && <NotificationsPanel />}
      {tab === "Health" && <HealthPanel />}
    </>
  );
}
