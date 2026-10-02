import { View, Text, Pressable, useWindowDimensions, ScrollView } from 'react-native';
import { useState, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientButton } from '@components/primitives';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList>;

const SLIDES = [
  {
    title: 'Discover Your Glow',
    body: 'Browse top salons, expert estheticians, and treatments tailored to your skin.',
    illustration: '✨',
  },
  {
    title: 'Book in Seconds',
    body: 'Find an open slot, book instantly, and pay securely — all in one app.',
    illustration: '📅',
  },
  {
    title: 'Track Your Wellness',
    body: 'Log your mood, hit your goals, and watch your skin transform over time.',
    illustration: '🌿',
  },
];

export function OnboardingCarouselScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goNext = () => {
    if (index < SLIDES.length - 1) {
      const next = index + 1;
      setIndex(next);
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
    } else {
      nav.replace('SignUp');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <View className="flex-row justify-end px-6 pt-2">
        <Pressable onPress={() => nav.replace('SignUp')} hitSlop={10}>
          <Text className="text-base font-medium text-ink">Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        className="flex-1"
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={{ width }} className="items-center justify-center px-10">
            <View className="w-48 h-48 rounded-full bg-sage-200 items-center justify-center mb-10">
              <Text style={{ fontSize: 72 }}>{s.illustration}</Text>
            </View>
            <Text className="text-3xl font-bold text-ink text-center mb-3">{s.title}</Text>
            <Text className="text-base text-ink-soft text-center leading-6">{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View className="flex-row justify-center gap-2 mb-8">
        {SLIDES.map((_, i) => (
          <View
            key={i}
            className={`h-2 rounded-full ${i === index ? 'bg-sage-700 w-6' : 'bg-sage-300 w-2'}`}
          />
        ))}
      </View>

      <View className="px-6 pb-4">
        <GradientButton label={index === SLIDES.length - 1 ? 'Get Started' : 'Next'} onPress={goNext} />
      </View>
    </SafeAreaView>
  );
}
