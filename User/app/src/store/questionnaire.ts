import { create } from 'zustand';
import { persist, storage } from './persist';

interface AllergenEntry { value: string; severity: 'Mild' | 'Moderate' | 'Severe' }

interface QuestionnaireState {
  mainGoals?: string;
  reminderFrequency?: string;
  journalingTime?: string;
  moodFrequency?: string;
  motivation?: string;

  skinType?: string;
  skinGoals: string[];

  oils: string[];
  likedIngredients: string[];
  dislikedIngredients: string[];

  allergens: AllergenEntry[];
  allergyNotes: string;

  serviceTypes?: string;
  treatmentStyle?: string;
  salonNotes: string;

  set: <K extends keyof Omit<QuestionnaireState, 'set' | 'reset'>>(key: K, value: QuestionnaireState[K]) => void;
  reset: () => void;
}

const initial = {
  skinGoals: [] as string[],
  oils: [] as string[],
  likedIngredients: [] as string[],
  dislikedIngredients: [] as string[],
  allergens: [] as AllergenEntry[],
  allergyNotes: '',
  salonNotes: '',
};

export const useQuestionnaire = create<QuestionnaireState>()(
  persist(
    (setState) => ({
      ...initial,
      set: (key, value) => setState((s) => ({ ...s, [key]: value })),
      reset: () => setState(() => ({ ...initial } as QuestionnaireState)),
    }),
    { name: 'teddy-questionnaire', storage }
  )
);
