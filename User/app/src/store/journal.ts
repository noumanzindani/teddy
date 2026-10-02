import { create } from 'zustand';
import { journalEntries as seed } from '@mock/index';
import type { JournalEntry, Mood } from '@app-types/index';
import { persist, storage } from './persist';

interface JournalState {
  entries: JournalEntry[];
  add: (entry: { title: string; body: string; mood?: Mood }) => void;
  update: (id: string, patch: Partial<JournalEntry>) => void;
  remove: (id: string) => void;
}

function todayIso() {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const useJournal = create<JournalState>()(
  persist(
    (set) => ({
      entries: [...seed],
      add: (e) =>
        set((s) => ({
          entries: [
            {
              id: `j${Date.now()}`,
              date: todayIso(),
              preview: e.body.split('\n')[0].slice(0, 80),
              body: e.body,
              mood: e.mood,
            },
            ...s.entries,
          ],
        })),
      update: (id, patch) => set((s) => ({ entries: s.entries.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      remove: (id) => set((s) => ({ entries: s.entries.filter((x) => x.id !== id) })),
    }),
    { name: 'teddy-journal', storage }
  )
);
