import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getAccessToken } from "./storage";

export type WsEvent = {
  at: string;
  type: string;
  payload: unknown;
  raw: string;
};

type SocketContextValue = {
  connected: boolean;
  events: WsEvent[];
  connect: () => void;
  disconnect: () => void;
  clear: () => void;
};

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<WsEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  const connect = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;
    disconnect();
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/ws?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (ev) => {
      let type = "unknown";
      let payload: unknown = ev.data;
      try {
        const parsed = JSON.parse(String(ev.data)) as { type?: string; payload?: unknown };
        type = parsed.type ?? "unknown";
        payload = parsed.payload ?? parsed;
      } catch {
        /* keep raw */
      }
      setEvents((prev) =>
        [{ at: new Date().toISOString(), type, payload, raw: String(ev.data) }, ...prev].slice(0, 80),
      );
    };
  }, [disconnect]);

  useEffect(() => {
    if (!enabled) {
      disconnect();
      return;
    }
    if (getAccessToken()) connect();
    return () => disconnect();
  }, [enabled, connect, disconnect]);

  const value = useMemo(
    () => ({
      connected,
      events,
      connect,
      disconnect,
      clear: () => setEvents([]),
    }),
    [connected, events, connect, disconnect],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    return {
      connected: false,
      events: [] as WsEvent[],
      connect: () => undefined,
      disconnect: () => undefined,
      clear: () => undefined,
    };
  }
  return ctx;
}

/** @deprecated use useSocket */
export function useLabSocket(_enabled: boolean) {
  return useSocket();
}
