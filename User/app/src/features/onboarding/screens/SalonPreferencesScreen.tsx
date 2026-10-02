import { View } from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { OnboardingStepLayout, FieldLabel } from '../components/OnboardingStepLayout';
import { PillSelect, RadioGroup, TextArea } from '@components/primitives';
import { useQuestionnaire } from '@store/index';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@navigation/types';

type Nav = NativeStackNavigationProp<OnboardingStackParamList>;

const STYLE_OPTIONS = [
  { value: 'relaxing', label: 'Relaxing & pampering' },
  { value: 'results', label: 'Results-focused' },
  { value: 'quick', label: 'Quick & efficient' },
  { value: 'thorough', label: 'Thorough & detailed' },
];

export function SalonPreferencesScreen() {
  const nav = useNavigation<Nav>();
  const q = useQuestionnaire();
  const [serviceTypes, setServiceTypes] = useState<string>();
  const [style, setStyle] = useState<string>();
  const [notes, setNotes] = useState('Any accessibility needs or things salons should know?');

  function saveAndContinue() {
    if (serviceTypes) q.set('serviceTypes', serviceTypes);
    if (style) q.set('treatmentStyle', style);
    q.set('salonNotes', notes);
    nav.navigate('ProfilePhoto');
  }

  return (
    <OnboardingStepLayout
      step={4}
      totalSteps={4}
      title="Your Salon Preferences"
      ctaLabel="Finish Setup"
      onCtaPress={saveAndContinue}
      onSkipPress={() => nav.navigate('ProfilePhoto')}
    >
      <View>
        <FieldLabel>Service types</FieldLabel>
        <PillSelect placeholder="Type here" value={serviceTypes} onPress={() => setServiceTypes('Facials, Nails')} />
      </View>
      <View>
        <FieldLabel>Service types</FieldLabel>
        <RadioGroup options={STYLE_OPTIONS} value={style} onChange={setStyle} columns={2} />
      </View>
      <View>
        <FieldLabel>Optional Notes</FieldLabel>
        <TextArea value={notes} onChangeText={setNotes} />
      </View>
    </OnboardingStepLayout>
  );
}
