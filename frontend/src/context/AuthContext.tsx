import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'elAcuerdo.token';

type JwtPayload = {
  id: number;
  rol: string;
  nombre?: string;
  usuario?: string;
  iat?: number;
  exp?: number;
};

function parseJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

type AuthContextValue = {
  token: string | null;
  payload: JwtPayload | null;
  setToken: (token: string | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });

  const payload = useMemo(() => (token ? parseJwt(token) : null), [token]);

  const setToken = (next: string | null) => {
    setTokenState(next);
    if (next) localStorage.setItem(STORAGE_KEY, next);
    else localStorage.removeItem(STORAGE_KEY);
  };

  const logout = () => setToken(null);

  // Auto-logout when the JWT expires.
  useEffect(() => {
    if (!token || !payload?.exp) return;
    const msUntilExpiry = payload.exp * 1000 - Date.now();
    if (msUntilExpiry <= 0) {
      logout();
      return;
    }
    const t = window.setTimeout(() => logout(), msUntilExpiry);
    return () => window.clearTimeout(t);
  }, [token, payload?.exp]);

  const value = useMemo(() => ({ token, payload, setToken, logout }), [token, payload]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
