// ── TEDDY Vendor — API client ─────────────────────────────────────────────────
// All responses unwrap the { data: ... } envelope from the backend.
// Token is read from the `teddy_token` cookie (set on login, cleared on logout).

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)teddy_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function setToken(token: string, refreshToken: string) {
  const maxAge = 7 * 24 * 60 * 60; // 7 days
  document.cookie = `teddy_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `teddy_refresh=${encodeURIComponent(refreshToken)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearToken() {
  document.cookie = 'teddy_token=; path=/; max-age=0';
  document.cookie = 'teddy_refresh=; path=/; max-age=0';
  document.cookie = 'teddy_vendor_id=; path=/; max-age=0';
}

export function setVendorId(id: string) {
  document.cookie = `teddy_vendor_id=${id}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
}

export function getVendorId(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)teddy_vendor_id=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

// ── Status normalisation (API → frontend) ─────────────────────────────────────
export type FrontendStatus = 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'pending';

export function normaliseStatus(apiStatus: string): FrontendStatus {
  const map: Record<string, FrontendStatus> = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED_CLIENT: 'cancelled',
    CANCELLED_VENDOR: 'cancelled',
    NO_SHOW: 'no_show',
    WAITLISTED: 'pending',
  };
  return map[apiStatus] ?? 'pending';
}

// ── Core fetch ────────────────────────────────────────────────────────────────
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
    cache: 'no-store',
  });

  // Session expired / invalid token → clear it and bounce to login.
  // Skip for the login call itself so bad-credential errors surface inline.
  if (res.status === 401 && !path.startsWith('/auth/')) {
    clearToken();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Your session has expired. Please sign in again.');
  }

  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? 'Request failed');
  return (json.data ?? json) as T;
}

export const api = {
  get:    <T>(path: string)                   => apiFetch<T>(path),
  post:   <T>(path: string, body: unknown)    => apiFetch<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)    => apiFetch<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)    => apiFetch<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(path: string)                   => apiFetch<T>(path, { method: 'DELETE' }),
};
