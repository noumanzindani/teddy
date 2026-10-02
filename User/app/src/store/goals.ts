import { create } from 'zustand';
import { goals as seed } from '@mock/index';
import type { Goal } from '@app-types/index';
import { persist, storage } from './persist';

interface GoalsState {
  goals: Goal[];
  addGoal: (g: Omit<Goal, 'id' | 'progress' | 'streak' | 'completed'>) => void;
  markProgress: (id: string, delta?: number) => void;
  markCompleted: (id: string) => void;
}

export const useGoals = create<GoalsState>()(
  persist(
    (set) => ({
      goals: [...seed],
      addGoal: (g) =>
        set((s) => ({
          goals: [
            ...s.goals,
            { id: `g${Date.now()}`, progress: 0, streak: 0, completed: false, ...g },
          ],
        })),
      markProgress: (id, delta = 0.1) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id
              ? {
                  ...g,
                  progress: Math.min(1, g.progress + delta),
                  streak: g.streak + 1,
                  completed: g.progress + delta >= 1,
                  count: (g.count ?? 0) + 1,
                }
              : g
          ),
        })),
      markCompleted: (id) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id ? { ...g, completed: true, progress: 1 } : g
          ),
        })),
    }),
    { name: 'teddy-goals', storage }
  )
);
