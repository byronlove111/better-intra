import { clearAuth, getAccessToken, getRefreshToken, setTokens } from "./storage";

export type ApiResult<T = unknown> = {
  ok: boolean;
  status: number;
  data: T | null;
  raw: string;
  error?: string;
};

type RequestOpts = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  apiKey?: string | null;
  query?: Record<string, string | number | boolean | undefined | null | Array<string | number>>;
  headers?: Record<string, string>;
  rawBody?: BodyInit | null;
  accept?: string;
};

function buildUrl(path: string, query?: RequestOpts["query"]): string {
  const url = new URL(path, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) {
        for (const item of value) url.searchParams.append(key, String(item));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.pathname + url.search;
}

async function parseBody(res: Response): Promise<{ data: unknown; raw: string }> {
  const raw = await res.text();
  if (!raw) return { data: null, raw: "" };
  try {
    return { data: JSON.parse(raw), raw };
  } catch {
    return { data: raw, raw };
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  const res = await fetch("/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) {
    clearAuth();
    return false;
  }
  const data = (await res.json()) as { access_token: string; refresh_token: string };
  setTokens(data.access_token, data.refresh_token);
  return true;
}

export async function api<T = unknown>(path: string, opts: RequestOpts = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.body !== undefined && opts.rawBody === undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (opts.accept) headers.Accept = opts.accept;
  if (opts.auth !== false) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (opts.apiKey) headers["X-API-Key"] = opts.apiKey;

  const doFetch = () =>
    fetch(buildUrl(path, opts.query), {
      method: opts.method ?? (opts.body !== undefined || opts.rawBody != null ? "POST" : "GET"),
      headers,
      body:
        opts.rawBody !== undefined
          ? opts.rawBody
          : opts.body !== undefined
            ? JSON.stringify(opts.body)
            : undefined,
    });

  let res = await doFetch();
  if (res.status === 401 && opts.auth !== false && getRefreshToken()) {
    const ok = await refreshAccessToken();
    if (ok) {
      const token = getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      res = await doFetch();
    }
  }

  const { data, raw } = await parseBody(res);
  if (!res.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data
        ? JSON.stringify((data as { detail: unknown }).detail)
        : raw || res.statusText;
    return { ok: false, status: res.status, data: data as T | null, raw, error: detail };
  }
  return { ok: true, status: res.status, data: data as T, raw };
}

export async function apiBlob(
  path: string,
  opts: RequestOpts = {},
): Promise<ApiResult<Blob>> {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.auth !== false) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(buildUrl(path, opts.query), { method: opts.method ?? "GET", headers });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, status: res.status, data: null, raw: text, error: text || res.statusText };
  }
  const blob = await res.blob();
  return { ok: true, status: res.status, data: blob, raw: `(blob ${blob.size} bytes)` };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
