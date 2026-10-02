const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getCookies(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  return document.cookie.split(';').reduce((acc, c) => {
    const [k, ...rest] = c.trim().split('=');
    acc[k] = rest.join('=');
    return acc;
  }, {} as Record<string, string>);
}

export function getToken(): string | null {
  return getCookies()['staff_token'] || null;
}

export function setToken(token: string, refreshToken: string) {
  const exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `staff_token=${token}; path=/; expires=${exp}; SameSite=Lax`;
  document.cookie = `staff_refresh=${refreshToken}; path=/; expires=${exp}; SameSite=Lax`;
}

export function clearToken() {
  ['staff_token', 'staff_refresh'].forEach(name => {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  });
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

  // Session expired / invalid token → clear it and bounce to the login screen.
  // Skip for the login call itself so bad-credential errors still surface inline.
  if (res.status === 401 && !path.startsWith('/auth/')) {
    clearToken();
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.location.href = '/';
    }
    throw new Error('Your session has expired. Please sign in again.');
  }

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || 'Request failed');
  return json.data ?? json;
}

export type StaffStatus = 'upcoming' | 'in_progress' | 'completed' | 'no_show' | 'cancelled';

export function normaliseStatus(apiStatus: string): StaffStatus {
  const map: Record<string, StaffStatus> = {
    PENDING: 'upcoming',
    CONFIRMED: 'upcoming',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    NO_SHOW: 'no_show',
    CANCELLED_CLIENT: 'cancelled',
    CANCELLED_VENDOR: 'cancelled',
    WAITLISTED: 'upcoming',
  };
  return map[apiStatus.toUpperCase()] ?? 'upcoming';
}

export const api = {
  get:    <T>(path: string)               => apiFetch<T>(path),
  post:   <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST',  body: body !== undefined ? JSON.stringify(body) : undefined }),
  put:    <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PUT',   body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch:  <T>(path: string, body: unknown)  => apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string)               => apiFetch<T>(path, { method: 'DELETE' }),
};

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: string;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await api.post<{ user: AuthUser; accessToken: string; refreshToken: string }>('/auth/login', { email, password });
  setToken(data.accessToken, data.refreshToken);
  return data.user;
}

export function logout() {
  clearToken();
  window.location.href = '/';
}
