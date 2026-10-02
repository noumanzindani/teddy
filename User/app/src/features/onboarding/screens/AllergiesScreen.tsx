import { View, Text, Pressable, TextInput } from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useQuestionnaire } from '@store/index';
import { Info } from 'lucide-react-native';
import { OnboardingStepLayout, FieldLabel } from '../components/OnboardingStepLayout';
import { PillSelect, TextArea } from '@components/primitives';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@navigation/types';

type Nav = NativeStackNavigationProp<OnboardingStackParamList>;

interface AllergenEntry { value: string; severity: 'Mild' | 'Moderate' | 'Severe' }

export function AllergiesScreen() {
  const nav = useNavigation<Nav>();
  const q = useQuestionnaire();
  const [draft, setDraft] = useState('');
  const [severity, setSeverity] = useState<'Mild' | 'Moderate' | 'Severe'>('Mild');
  const [allergens, setAllergens] = useState<AllergenEntry[]>([]);
  const [notes, setNotes] = useState('');

  const addMore = () => {
    if (!draft.trim()) return;
    setAllergens([...allergens, { value: draft.trim(), severity }]);
    setDraft('');
    setSeverity('Mild');
  };

  function saveAndContinue() {
    q.set('allergens', allergens);
    q.set('allergyNotes', notes);
    nav.navigate('SalonPreferences');
  }

  return (
    <OnboardingStepLayout
      step={3}
      totalSteps={4}
      title="Any Allergies Or Sensitivities?"
      ctaLabel="Next"
      onCtaPress={saveAndContinue}
      onSkipPress={() => nav.navigate('SalonPreferences')}
    >
      <View>
        <FieldLabel>Allergen</FieldLabel>
        <View className="flex-row gap-3">
          <View className="flex-1 bg-surface-input rounded-full px-5 py-3.5">
            <TextInput
              placeholder="Type here"
              placeholderTextColor="#6B6B62"
              value={draft}
              onChangeText={setDraft}
              className="text-ink text-base"
            />
          </View>
          <View className="w-32">
            <PillSelect value={severity} onPress={() => {
              const next: Record<string, 'Mild' | 'Moderate' | 'Severe'> = { Mild: 'Moderate', Moderate: 'Severe', Severe: 'Mild' };
              setSeverity(next[severity]);
            }} />
          </View>
        </View>

        <Pressable
          onPress={addMore}
          className="mt-3 border border-gold-600 rounded-full py-3 items-center active:opacity-80"
        >
          <Text className="text-base font-semibold text-ink">Add More</Text>
        </Pressable>

        {allergens.length > 0 && (
          <View className="mt-3 gap-2">
            {allergens.map((a, i) => (
              <View key={i} className="flex-row items-center justify-between bg-surface-card px-4 py-2 rounded-full border border-sage-300">
                <Text className="text-sm text-ink font-medium">{a.value}</Text>
                <Text className="text-xs text-ink-muted">{a.severity}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View>
        <FieldLabel>Optional Notes</FieldLabel>
        <TextArea
          placeholder="Anything else your provider should know?"
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      <View className="flex-row items-center bg-red-100 rounded-full px-4 py-2.5">
        <Info size={16} color="#C44545" />
        <Text className="ml-2 text-sm text-danger">
          This information is shared with salons when you book
        </Text>
      </View>
    </OnboardingStepLayout>
  );
}
