import { useState } from "react";
import type { ApiResult } from "../lib/api";
import { api } from "../lib/api";
import { Field, Panel, Result, Row } from "../components/ui";

function isoInHours(hours: number): string {
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

export function EventsPanel() {
  const [q, setQ] = useState("");
  const [title, setTitle] = useState("Lab meetup");
  const [location, setLocation] = useState("Cluster");
  const [eventId, setEventId] = useState("");
  const [beginAt, setBeginAt] = useState(isoInHours(24));
  const [endAt, setEndAt] = useState(isoInHours(26));
  const [result, setResult] = useState<ApiResult | null>(null);

  return (
    <Panel title="Events (JWT)" hint="Unified Intra + BetterIntra feed · BI CRUD">
      <Row>
        <Field label="Search q">
          <input value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <button
          className="action primary"
          onClick={async () =>
            setResult(
              await api("/events", {
                query: {
                  q: q || undefined,
                  limit: 20,
                  sources: ["intra", "betterintra"],
                },
              }),
            )
          }
        >
          GET /events
        </button>
      </Row>
      <Row>
        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Location">
          <input value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label="begin_at">
          <input value={beginAt} onChange={(e) => setBeginAt(e.target.value)} />
        </Field>
        <Field label="end_at">
          <input value={endAt} onChange={(e) => setEndAt(e.target.value)} />
        </Field>
        <button
          className="action"
          onClick={async () => {
            const res = await api("/events", {
              method: "POST",
              body: {
                title,
                description: "Created from api-lab",
                location,
                begin_at: beginAt,
                end_at: endAt,
              },
            });
            setResult(res);
            if (res.data && typeof res.data === "object" && "id" in res.data) {
              setEventId(String((res.data as { id: number }).id));
            }
          }}
        >
          Create BI event
        </button>
      </Row>
      <Row>
        <Field label="Event id">
          <input value={eventId} onChange={(e) => setEventId(e.target.value)} />
        </Field>
        <button
          className="action"
          onClick={async () => setResult(await api(`/events/${encodeURIComponent(eventId)}`))}
        >
          Get
        </button>
        <button
          className="action"
          onClick={async () =>
            setResult(
              await api(`/events/${encodeURIComponent(eventId)}`, {
                method: "PATCH",
                body: { title: `${title} (edited)` },
              }),
            )
          }
        >
          Patch
        </button>
        <button
          className="action danger"
          onClick={async () =>
            setResult(await api(`/events/${encodeURIComponent(eventId)}`, { method: "DELETE" }))
          }
        >
          Delete
        </button>
      </Row>
      <Result result={result} />
    </Panel>
  );
}
