import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';

export const storage = createJSONStorage(() => AsyncStorage);

export { persist };
