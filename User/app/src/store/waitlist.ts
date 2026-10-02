import { create } from 'zustand';
import { persist, storage } from './persist';

export interface WaitlistEntry {
  id: string;
  serviceId: string;
  serviceName: string;
  salonId: string;
  salonName: string;
  requestedDate: string;
  joinedAt: string; // ISO
}

interface WaitlistState {
  entries: WaitlistEntry[];
  addEntry: (entry: Omit<WaitlistEntry, 'id' | 'joinedAt'>) => void;
  removeEntry: (id: string) => void;
}

export const useWaitlist = create<WaitlistState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) =>
        set((s) => ({
          entries: [
            ...s.entries,
            { ...entry, id: `wl-${Date.now()}`, joinedAt: new Date().toISOString() },
          ],
        })),
      removeEntry: (id) =>
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
    }),
    { name: 'teddy-waitlist', storage }
  )
);
