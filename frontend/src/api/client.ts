import { useAuth } from '../context/AuthContext';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type ApiError = {
  status: number;
  message: string;
  details?: unknown;
};

async function parseJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch<T>(path: string, opts?: { method?: string; body?: any; token?: string | null }) {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const hadToken = Boolean(opts?.token);
  const res = await fetch(url, {
    method: opts?.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });

  const data = await parseJsonSafe(res);

  // If the token is expired/invalid, kick the user back to login.
  // Only do this when we actually sent a token (avoid redirecting on bad credentials at /auth/login).
  if (res.status === 401 && hadToken) {
    try {
      localStorage.removeItem('elAcuerdo.token');
    } catch {
      // ignore
    }
    if (window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
    const err: ApiError = {
      status: 401,
      message: 'Sesión expirada',
      details: data,
    };
    throw err;
  }

  if (!res.ok) {
    const err: ApiError = {
      status: res.status,
      message: (data && (data.message || data.error)) || `HTTP ${res.status}`,
      details: data,
    };
    throw err;
  }

  return data as T;
}

export function useApi() {
  const { token } = useAuth();
  return {
    get: <T,>(path: string) => apiFetch<T>(path, { token }),
    post: <T,>(path: string, body: any) => apiFetch<T>(path, { method: 'POST', body, token }),
    put: <T,>(path: string, body: any) => apiFetch<T>(path, { method: 'PUT', body, token }),
    patch: <T,>(path: string, body: any) => apiFetch<T>(path, { method: 'PATCH', body, token }),
    del: <T,>(path: string) => apiFetch<T>(path, { method: 'DELETE', token }),
  };
}
