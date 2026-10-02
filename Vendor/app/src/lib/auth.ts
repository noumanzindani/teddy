import { api, setToken, setVendorId, clearToken } from './api';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl: string | null;
}

export interface Vendor {
  id: string;
  businessName: string;
  slug: string;
  city: string | null;
  avgRating: number;
  status: string;
}

export async function login(email: string, password: string): Promise<{ user: AuthUser; vendor: Vendor | null }> {
  const data = await api.post<{ user: AuthUser; accessToken: string; refreshToken: string }>(
    '/auth/login',
    { email, password }
  );

  setToken(data.accessToken, data.refreshToken);

  // Fetch vendor profile to get vendorId
  let vendor: Vendor | null = null;
  if (data.user.role === 'vendor_owner') {
    try {
      vendor = await api.get<Vendor>('/vendors/me');
      setVendorId(vendor.id);
    } catch {
      // User exists but may not have a vendor yet
    }
  }

  return { user: data.user, vendor };
}

export function logout() {
  clearToken();
  if (typeof window !== 'undefined') window.location.href = '/login';
}
