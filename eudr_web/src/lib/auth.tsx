"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api";
import { queryClient } from "./query";
import type { Organization, Session, User } from "./types";

interface AuthState {
  user: User | null;
  organization: Organization | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { organization_name: string; name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api<{ user: User; organization: Organization }>("/api/v1/auth/me")
      .then((me) => {
        setUser(me.user);
        setOrganization(me.organization);
      })
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const accept = (s: Session) => {
    queryClient.clear(); // never show one company's cached data to another
    setToken(s.access_token);
    setUser(s.user);
    setOrganization(s.organization);
  };

  const login = useCallback(async (email: string, password: string) => {
    accept(await api<Session>("/api/v1/auth/login", { body: { email, password } }));
  }, []);

  const register = useCallback(
    async (data: { organization_name: string; name: string; email: string; password: string }) => {
      accept(await api<Session>("/api/v1/auth/register", { body: data }));
    },
    [],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setOrganization(null);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ user, organization, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
