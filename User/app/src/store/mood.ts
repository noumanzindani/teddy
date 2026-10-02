import { create } from 'zustand';
import { moodLogs as seed } from '@mock/index';
import type { Mood, MoodLog } from '@app-types/index';
import { persist, storage } from './persist';

interface MoodState {
  logs: MoodLog[];
  todaysMood?: Mood;
  logMood: (mood: Mood, note?: string) => void;
}

function todayIso() {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const useMood = create<MoodState>()(
  persist(
    (set) => ({
      logs: [...seed],
      logMood: (mood, note) =>
        set((s) => ({
          todaysMood: mood,
          logs: [{ id: `m${Date.now()}`, date: todayIso(), mood, note }, ...s.logs],
        })),
    }),
    { name: 'teddy-mood', storage }
  )
);
