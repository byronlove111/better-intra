import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api";
import { clearAuth, getAccessToken, setTokens } from "./storage";

export type AuthUser = {
  id: number;
  email: string;
  login: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_intra_linked: boolean;
  bio?: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      return;
    }
    const res = await api<AuthUser>("/auth/me");
    if (res.ok && res.data) setUser(res.data);
    else {
      clearAuth();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refreshMe();
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshMe]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ access_token: string; refresh_token: string; user: AuthUser }>(
      "/auth/login",
      { auth: false, body: { email, password } },
    );
    if (!res.ok || !res.data) return res.error ?? "Login failed";
    setTokens(res.data.access_token, res.data.refresh_token);
    setUser(res.data.user);
    return null;
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const res = await api<{ access_token: string; refresh_token: string; user: AuthUser }>(
      "/auth/register",
      { auth: false, body: { email, password } },
    );
    if (!res.ok || !res.data) return res.error ?? "Register failed";
    setTokens(res.data.access_token, res.data.refresh_token);
    setUser(res.data.user);
    return null;
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshMe }),
    [user, loading, login, register, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
