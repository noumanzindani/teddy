import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { GradientButton, StepProgressBar } from '@components/primitives';

interface Props {
  step?: number;
  totalSteps?: number;
  title: string;
  ctaLabel: string;
  onCtaPress: () => void;
  children: ReactNode;
  onSkipPress?: () => void;
}

export function OnboardingStepLayout({
  step, totalSteps, title, ctaLabel, onCtaPress, children, onSkipPress,
}: Props) {
  const nav = useNavigation();
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-row items-center justify-between px-6 pt-4">
          <Pressable onPress={() => nav.goBack()} hitSlop={10}>
            <ChevronLeft size={28} color="#1B1B16" />
          </Pressable>
          <Pressable onPress={onSkipPress ?? onCtaPress} hitSlop={10}>
            <Text className="text-base font-medium text-ink">Skip</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {step != null && totalSteps != null && (
            <View className="mb-2">
              <StepProgressBar current={step} total={totalSteps} />
            </View>
          )}
          <Text className="text-3xl font-bold text-ink mt-2 mb-6">{title}</Text>
          <View className="gap-5">{children}</View>
        </ScrollView>

        <View className="px-6 pb-4">
          <GradientButton label={ctaLabel} onPress={onCtaPress} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <Text className="text-base font-semibold text-ink mb-2">{children}</Text>;
}
