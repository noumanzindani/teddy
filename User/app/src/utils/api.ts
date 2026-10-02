/**
 * TEDDY User App — API client
 *
 * Reads the JWT from the Zustand auth store (persisted in AsyncStorage).
 * Change API_BASE_URL to point at your backend (or add it to app.json extra).
 */

import { useAuth } from '@store/index';
import { resetToAuth } from '../navigation/navigationRef';

// Set EXPO_PUBLIC_API_URL at build time to point at your backend (staging/prod).
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://teddy-api-production.up.railway.app';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = useAuth.getState().token;
  const res = await fetch(`${API_BASE_URL}/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  // Session expired / invalid token → clear it and send the user back to login,
  // instead of silently showing an empty screen. Skip for the auth endpoints so
  // bad-credential errors still surface on the login form.
  if (res.status === 401 && !path.startsWith('/auth/')) {
    useAuth.getState().clearToken();
    resetToAuth();
    throw new Error('Your session has expired. Please sign in again.');
  }

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

// ── Response shapes from the backend ─────────────────────────────────────────

export interface ApiUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: string;
  avatarUrl?: string | null;
  tier?: string;
  pointsBalance?: number;
}

export interface ApiVendor {
  id: string;
  businessName: string;
  bio: string | null;
  address: string | null;
  rating?: number;
  reviewCount?: number;
  openHours?: Record<string, { open: boolean; from: string; to: string }> | null;
  coverUrl?: string | null;
  logoUrl?: string | null;
}

export interface ApiService {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMin: number;
  category: string;
  imageUrl?: string | null;
  vendorId: string;
  vendor?: ApiVendor;
}

export interface ApiBooking {
  id: string;
  service: ApiService;
  vendor: ApiVendor;
  startsAt: string; // ISO
  endsAt: string;   // ISO
  status: string;
  totalAmount: number;
  staffMember?: { user: { firstName: string; lastName: string } } | null;
}

export interface ApiThread {
  id: string;
  vendor: ApiVendor;
  lastMessage?: {
    content: string;
    createdAt: string;
    senderRole: string;
  } | null;
  unreadCount?: number;
}

export interface ApiMessage {
  id: string;
  threadId: string;
  content: string;
  senderRole: string; // 'client' | 'vendor_owner' | 'vendor_staff'
  createdAt: string;
}

export interface ApiNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface ApiReward {
  id: string;
  name: string;
  pointsRequired: number;
  description?: string | null;
}

export interface ApiPointsTransaction {
  id: string;
  delta: number;
  reason: string;
  createdAt: string;
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

export async function loginWithEmail(email: string, password: string) {
  const data = await api.post<{
    user: ApiUser;
    accessToken: string;
    refreshToken: string;
  }>('/auth/login', { email, password });
  return data;
}

export async function registerUser(payload: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role?: string;
}) {
  const data = await api.post<{
    user: ApiUser;
    accessToken: string;
    refreshToken: string;
  }>('/auth/register', { ...payload, role: payload.role ?? 'client' });
  return data;
}
