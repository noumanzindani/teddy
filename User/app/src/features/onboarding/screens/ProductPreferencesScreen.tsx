import { View } from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { OnboardingStepLayout, FieldLabel } from '../components/OnboardingStepLayout';
import { TagInput } from '@components/primitives';
import { useQuestionnaire } from '@store/index';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@navigation/types';

type Nav = NativeStackNavigationProp<OnboardingStackParamList>;

export function ProductPreferencesScreen() {
  const nav = useNavigation<Nav>();
  const q = useQuestionnaire();
  const [oils, setOils] = useState<string[]>(['Argan oil', 'Rosehip oil']);
  const [liked, setLiked] = useState<string[]>([]);
  const [disliked, setDisliked] = useState<string[]>([]);

  function saveAndContinue() {
    q.set('oils', oils);
    q.set('likedIngredients', liked);
    q.set('dislikedIngredients', disliked);
    nav.navigate('Allergies');
  }

  return (
    <OnboardingStepLayout
      step={2}
      totalSteps={4}
      title="Your Product Preferences"
      ctaLabel="Next"
      onCtaPress={saveAndContinue}
      onSkipPress={() => nav.navigate('Allergies')}
    >
      <View>
        <FieldLabel>Oils I prefer</FieldLabel>
        <TagInput tags={oils} onChange={setOils} />
      </View>
      <View>
        <FieldLabel>Ingredients I love</FieldLabel>
        <TagInput tags={liked} onChange={setLiked} />
      </View>
      <View>
        <FieldLabel>Ingredients I want to avoid</FieldLabel>
        <TagInput tags={disliked} onChange={setDisliked} />
      </View>
    </OnboardingStepLayout>
  );
}
