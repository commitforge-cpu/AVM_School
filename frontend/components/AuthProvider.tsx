"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, AUTH_EXPIRED_EVENT, getToken, setToken } from "@/lib/api";
import type { Role, Student, TokenResponse, UserView } from "@/lib/types";

interface AuthState {
  user: UserView | null;
  student: Student | null;
  loading: boolean;
  login: (email: string, password: string, loginAs: Role) => Promise<UserView>;
  register: (form: FormData) => Promise<UserView>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserView | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async (): Promise<UserView | null> => {
    if (!getToken()) {
      setUser(null);
      setStudent(null);
      return null;
    }
    try {
      const me = await api<{ user: UserView; student: Student | null }>("/api/auth/me");
      setUser(me.user);
      setStudent(me.student);
      return me.user;
    } catch {
      setUser(null);
      setStudent(null);
      return null;
    }
  }, []);

  useEffect(() => {
    loadMe().finally(() => setLoading(false));
    const expired = () => { setUser(null); setStudent(null); };
    window.addEventListener(AUTH_EXPIRED_EVENT, expired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, expired);
  }, [loadMe]);

  const finish = useCallback(async (token: TokenResponse) => {
    setToken(token.accessToken);
    const u = await loadMe();
    if (!u) throw new Error("Logged in, but your account details couldn't be loaded. Try again.");
    return u;
  }, [loadMe]);

  const login = useCallback(
    async (email: string, password: string, loginAs: Role) =>
      finish(await api<TokenResponse>("/api/auth/login", { body: { email, password, loginAs } })),
    [finish],
  );

  const register = useCallback(
    async (form: FormData) => finish(await api<TokenResponse>("/api/auth/register", { form })),
    [finish],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setStudent(null);
  }, []);

  const refresh = useCallback(async () => { await loadMe(); }, [loadMe]);

  const value = useMemo(
    () => ({ user, student, loading, login, register, logout, refresh }),
    [user, student, loading, login, register, logout, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
