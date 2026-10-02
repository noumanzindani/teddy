import { create } from 'zustand';
import { reminders as seed } from '@mock/index';
import type { Reminder } from '@app-types/index';
import { persist, storage } from './persist';

interface RemindersState {
  reminders: Reminder[];
  add: (r: Omit<Reminder, 'id'>) => void;
  update: (id: string, patch: Partial<Reminder>) => void;
  remove: (id: string) => void;
}

export const useReminders = create<RemindersState>()(
  persist(
    (set) => ({
      reminders: [...seed],
      add: (r) => set((s) => ({ reminders: [...s.reminders, { id: `r${Date.now()}`, ...r }] })),
      update: (id, patch) => set((s) => ({ reminders: s.reminders.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      remove: (id) => set((s) => ({ reminders: s.reminders.filter((x) => x.id !== id) })),
    }),
    { name: 'teddy-reminders', storage }
  )
);
