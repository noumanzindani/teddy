import { View, Text, Pressable } from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { OnboardingStepLayout, FieldLabel } from '../components/OnboardingStepLayout';
import { useQuestionnaire } from '@store/index';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@navigation/types';

type Nav = NativeStackNavigationProp<OnboardingStackParamList>;

const SKIN_TYPES = ['Oily', 'Dry', 'Combination', 'Normal', 'Sensitive'];
const SKIN_GOALS = ['Hydration', 'Anti-aging', 'Acne control', 'Brightening', 'Even tone', 'Relaxation'];

function SelectionChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-4 py-2.5 rounded-full border ${
        selected ? 'bg-sage-600 border-sage-600' : 'bg-surface-input border-sage-300'
      }`}
    >
      <Text className={`text-sm font-medium ${selected ? 'text-white' : 'text-ink-soft'}`}>{label}</Text>
    </Pressable>
  );
}

export function SkinProfileScreen() {
  const nav = useNavigation<Nav>();
  const skinType = useQuestionnaire((s) => s.skinType);
  const goals = useQuestionnaire((s) => s.skinGoals);
  const setQ = useQuestionnaire((s) => s.set);

  const setSkinType = (t: string) => setQ('skinType', t);
  const toggleGoal = (g: string) => {
    setQ('skinGoals', goals.includes(g) ? goals.filter((x) => x !== g) : [...goals, g]);
  };

  return (
    <OnboardingStepLayout
      step={1}
      totalSteps={4}
      title="Tell Us About Your Skin"
      ctaLabel="Next"
      onCtaPress={() => nav.navigate('ProductPreferences')}
      onSkipPress={() => nav.navigate('ProductPreferences')}
    >
      <View>
        <FieldLabel>Skin Type</FieldLabel>
        <View className="flex-row flex-wrap gap-2">
          {SKIN_TYPES.map((t) => (
            <SelectionChip key={t} label={t} selected={skinType === t} onPress={() => setSkinType(t)} />
          ))}
        </View>
      </View>
      <View>
        <FieldLabel>Skin Goals</FieldLabel>
        <View className="flex-row flex-wrap gap-2">
          {SKIN_GOALS.map((g) => (
            <SelectionChip key={g} label={g} selected={goals.includes(g)} onPress={() => toggleGoal(g)} />
          ))}
        </View>
      </View>
    </OnboardingStepLayout>
  );
}
