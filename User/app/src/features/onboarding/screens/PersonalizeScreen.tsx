import { View } from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { OnboardingStepLayout, FieldLabel } from '../components/OnboardingStepLayout';
import { PillSelect } from '@components/primitives';
import { useQuestionnaire } from '@store/index';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@navigation/types';

type Nav = NativeStackNavigationProp<OnboardingStackParamList>;

const QUESTIONS: { key: string; storeKey: 'mainGoals' | 'reminderFrequency' | 'journalingTime' | 'moodFrequency' | 'motivation'; label: string }[] = [
  { key: 'goals',      storeKey: 'mainGoals',         label: 'What are your main goals?' },
  { key: 'reminders',  storeKey: 'reminderFrequency', label: 'How often do you want reminders?' },
  { key: 'journaling', storeKey: 'journalingTime',    label: 'When do you prefer journaling?' },
  { key: 'mood',       storeKey: 'moodFrequency',     label: 'How often would you like to track your mood?' },
  { key: 'motivation', storeKey: 'motivation',        label: 'What keeps you motivated?' },
];

export function PersonalizeScreen() {
  const nav = useNavigation<Nav>();
  const q = useQuestionnaire();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  function saveAndContinue() {
    QUESTIONS.forEach(({ key, storeKey }) => {
      if (answers[key]) q.set(storeKey, answers[key]);
    });
    nav.navigate('SkinProfile');
  }

  return (
    <OnboardingStepLayout
      title="Let's Personalize Your Experience"
      ctaLabel="Next"
      onCtaPress={saveAndContinue}
      onSkipPress={() => nav.navigate('SkinProfile')}
    >
      {QUESTIONS.map((question) => (
        <View key={question.key}>
          <FieldLabel>{question.label}</FieldLabel>
          <PillSelect
            placeholder="Enter"
            value={answers[question.key]}
            onPress={() => {
              setAnswers({ ...answers, [question.key]: 'Daily' });
            }}
          />
        </View>
      ))}
    </OnboardingStepLayout>
  );
}
