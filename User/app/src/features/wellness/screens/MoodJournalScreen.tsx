import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Menu, Lightbulb } from 'lucide-react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { MiniCalendar } from '@features/home/components/MiniCalendar';
import { useMood } from '@store/index';
import type { Mood } from '@app-types/index';

const MOODS = [
  { key: 'sad', emoji: '😔', label: 'Sad', color: '#C5C2A8' },
  { key: 'meh', emoji: '😐', label: 'Meh', color: '#C5C2A8' },
  { key: 'happy', emoji: '🙂', label: 'Happy', color: '#C5C2A8' },
  { key: 'glowing', emoji: '😊', label: 'Glowing', color: '#C5C2A8' },
  { key: 'great', emoji: '😎', label: 'Great', color: '#E0C58A' },
];

export function MoodJournalScreen() {
  const nav = useNavigation();
  const moodLogs = useMood((s) => s.logs);
  const logMood = useMood((s) => s.logMood);
  const todaysMood = useMood((s) => s.todaysMood);
  const [selected, setSelected] = useState<string | undefined>(todaysMood);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
          <View className="flex-row items-center">
            <Pressable onPress={() => nav.goBack()} hitSlop={10} className="mr-3">
              <Menu size={22} color="#1B1B16" />
            </Pressable>
            <Text className="text-2xl font-bold text-ink">My Mood Journal</Text>
          </View>
          <Bell size={22} color="#1B1B16" />
        </View>

        {/* Mood selector */}
        <View className="mx-5 mt-4 bg-surface-raised rounded-2xl p-5">
          <Text className="text-base font-bold text-ink text-center mb-4">
            How are you feeling right now?
          </Text>
          <View className="flex-row justify-between">
            {MOODS.map((m) => {
              const active = selected === m.key;
              return (
                <Pressable
                  key={m.key}
                  onPress={() => {
                    setSelected(m.key);
                    const moodMap: Record<string, Mood> = {
                      sad: 'stressed', meh: 'tired', happy: 'happy', glowing: 'glowing', great: 'energised',
                    };
                    logMood(moodMap[m.key] ?? 'happy');
                  }}
                  className="items-center"
                >
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center"
                    style={{ backgroundColor: active ? m.color : '#DEDBCA', opacity: active ? 1 : 0.7 }}
                  >
                    <Text style={{ fontSize: 24 }}>{m.emoji}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Insights card */}
        <View className="mx-5 mt-5 bg-sage-700 rounded-2xl p-4 flex-row">
          <View className="w-9 h-9 rounded-full bg-white/20 items-center justify-center mr-3">
            <Lightbulb size={18} color="#FFF" />
          </View>
          <View className="flex-1">
            <Text className="text-sm text-white/95 leading-5">
              You've logged Stressed 4 times this month. Explore calming treatments.
            </Text>
            <Pressable className="mt-3 self-start">
              <View className="bg-white rounded-full px-4 py-2">
                <Text className="text-sm font-semibold text-ink">Browse Services</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Monthly Flow */}
        <View className="px-5 mt-6">
          <Text className="text-base font-bold text-ink mb-2">Monthly Flow</Text>
          <MiniCalendar />
        </View>

        {/* Recent reflections */}
        <View className="px-5 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-ink">Recent Reflections</Text>
            <Pressable hitSlop={6}><Text className="text-sm text-ink-muted">See All</Text></Pressable>
          </View>
          <View className="bg-surface-raised rounded-2xl p-4 gap-4">
            {moodLogs.slice(0, 3).map((m) => (
              <View key={m.id} className="flex-row items-center">
                <View className="w-9 h-9 rounded-full bg-sage-300 items-center justify-center mr-3">
                  <Text style={{ fontSize: 18 }}>{m.mood === 'glowing' ? '😊' : m.mood === 'stressed' ? '😟' : '🙂'}</Text>
                </View>
                <View>
                  <Text className="text-base font-semibold text-ink capitalize">{m.mood === 'glowing' ? 'Feeling Great' : m.mood}</Text>
                  <Text className="text-xs text-ink-muted">{m.date}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
