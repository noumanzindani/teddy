import { create } from 'zustand';
import { persist, storage } from './persist';

const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const MAX_ATTEMPTS = 5;

interface AuthState {
  token: string | null;
  loginAttempts: number;
  lockedUntil: number | null; // epoch ms
  setToken: (token: string) => void;
  clearToken: () => void;
  recordFailedAttempt: () => void;
  resetAttempts: () => void;
  isLocked: () => boolean;
  lockRemainingMs: () => number;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      loginAttempts: 0,
      lockedUntil: null,

      setToken: (token) => set({ token, loginAttempts: 0, lockedUntil: null }),
      clearToken: () => set({ token: null }),

      recordFailedAttempt: () => {
        const attempts = get().loginAttempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          set({ loginAttempts: attempts, lockedUntil: Date.now() + LOCK_DURATION_MS });
        } else {
          set({ loginAttempts: attempts });
        }
      },

      resetAttempts: () => set({ loginAttempts: 0, lockedUntil: null }),

      isLocked: () => false,

      lockRemainingMs: () => {
        const { lockedUntil } = get();
        if (!lockedUntil) return 0;
        return Math.max(0, lockedUntil - Date.now());
      },
    }),
    {
      name: 'teddy-auth',
      storage,
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.loginAttempts = 0;
          state.lockedUntil = null;
        }
      },
    }
  )
);
