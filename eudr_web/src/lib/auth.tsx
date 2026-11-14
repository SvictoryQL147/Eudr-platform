"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";
import { queryClient } from "./query";
import type { Organization, Permission, Session, User } from "./types";

interface AuthState {
  user: User | null;
  organization: Organization | null;
  permissions: Permission[];
  loading: boolean;
  /** What the server will allow; use it to hide buttons a role can't use. */
  can: (p: Permission) => boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { organization_name: string; name: string; email: string; password: string }) => Promise<void>;
  accept: (s: Session) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // The session lives in an httpOnly cookie; ask the server who we are.
    api<Session>("/api/v1/auth/me")
      .then((me) => {
        setUser(me.user);
        setOrganization(me.organization);
        setPermissions(me.permissions || []);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const accept = useCallback((s: Session) => {
    queryClient.clear(); // never show one company's cached data to another
    setUser(s.user);
    setOrganization(s.organization);
    setPermissions(s.permissions || []);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      accept(await api<Session>("/api/v1/auth/login", { body: { email, password } }));
    },
    [accept],
  );

  const register = useCallback(
    async (data: { organization_name: string; name: string; email: string; password: string }) => {
      accept(await api<Session>("/api/v1/auth/register", { body: data }));
    },
    [accept],
  );

  const logout = useCallback(async () => {
    try {
      await api("/api/v1/auth/logout", { method: "POST" });
    } catch {
      /* cookie expires on its own */
    }
    queryClient.clear();
    setUser(null);
    setOrganization(null);
    setPermissions([]);
    window.location.href = "/login";
  }, []);

  const can = useCallback((p: Permission) => permissions.includes(p), [permissions]);

  return (
    <AuthContext.Provider value={{ user, organization, permissions, loading, can, login, register, accept, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Renders children only when the signed-in user holds `perm`. */
export function Can({ perm, children }: { perm: Permission; children: React.ReactNode }) {
  const { can } = useAuth();
  return can(perm) ? <>{children}</> : null;
}
