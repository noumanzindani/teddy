/**
 * TEDDY Admin Panel — API client
 *
 * Reads the admin JWT from the `admin_token` cookie.
 * The admin role is enforced server-side; the cookie is set on login.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)admin_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function setToken(token: string) {
  const maxAge = 8 * 60 * 60; // 8 hours
  document.cookie = `admin_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Strict`;
}

export function clearToken() {
  document.cookie = 'admin_token=; path=/; max-age=0';
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || 'Request failed');
  return json.data ?? json;
}

export const api = {
  get:    <T>(path: string)                => apiFetch<T>(path),
  post:   <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST',   body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch:  <T>(path: string, body: unknown)  => apiFetch<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(path: string)                => apiFetch<T>(path, { method: 'DELETE' }),
};

export async function adminLogin(email: string, password: string) {
  const data = await api.post<{ user: { role: string; email: string; firstName: string }; accessToken: string }>(
    '/auth/login',
    { email, password }
  );
  if (data.user.role !== 'admin') throw new Error('Access denied — admin account required.');
  setToken(data.accessToken);
  return data.user;
}

export function logout() {
  clearToken();
  window.location.href = '/login';
}

// ── Status normalisation ──────────────────────────────────────────────────────

export type VendorStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'info_requested';

export function normaliseVendorStatus(apiStatus: string): VendorStatus {
  const map: Record<string, VendorStatus> = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    SUSPENDED: 'suspended',
  };
  return map[apiStatus.toUpperCase()] ?? 'pending';
}
