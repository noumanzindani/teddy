import { create } from 'zustand';
import { persist, storage } from './persist';

interface UserState {
  id: string | null;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarUri: string;
  points: number;
  tier: string;
  // Setters
  setAvatar: (uri: string) => void;
  setName: (name: string) => void;
  setEmail: (email: string) => void;
  setPhone: (phone: string) => void;
  setPoints: (points: number) => void;
  setFromApi: (u: {
    id?: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
    pointsBalance?: number;
    tier?: string;
  }) => void;
  reset: () => void;
}

const DEFAULTS: Omit<UserState, keyof Pick<UserState,
  'setAvatar' | 'setName' | 'setEmail' | 'setPhone' | 'setPoints' | 'setFromApi' | 'reset'
>> = {
  id: null,
  name: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  avatarUri: '',
  points: 0,
  tier: 'BRONZE',
};

export const useUser = create<UserState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setAvatar: (uri) => set({ avatarUri: uri }),
      setName: (name) => set({ name }),
      setEmail: (email) => set({ email }),
      setPhone: (phone) => set({ phone }),
      setPoints: (points) => set({ points }),
      setFromApi: (u) => set({
        id: u.id ?? null,
        firstName: u.firstName,
        lastName: u.lastName,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email ?? '',
        phone: u.phone ?? '',
        avatarUri: u.avatarUrl ?? '',
        points: u.pointsBalance ?? 0,
        tier: u.tier ?? 'BRONZE',
      }),
      reset: () => set({ ...DEFAULTS }),
    }),
    { name: 'teddy-user', storage }
  )
);
