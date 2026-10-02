import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Sparkles, Sun, Moon } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useState, useEffect } from 'react';
import { api } from '@utils/api';

interface RoutineStep {
  period: string; // 'AM' | 'PM'
  order?: number;
  product: string;
  instructions?: string | null;
  frequency?: string | null;
  notes?: string | null;
}

interface Routine {
  steps: RoutineStep[];
  sentToClient?: boolean;
  updatedAt?: string;
}

export function MyRoutineScreen() {
  const nav = useNavigation();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Routine[]>('/routines/me')
      .then((rows) => setRoutine((rows ?? [])[0] ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const byPeriod = (p: string) =>
    (routine?.steps ?? [])
      .filter((s) => (s.period || '').toUpperCase() === p)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const fmt = (d?: string) =>
    d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  const Section = ({ title, icon, steps }: { title: string; icon: React.ReactNode; steps: RoutineStep[] }) => {
    if (steps.length === 0) return null;
    return (
      <>
        <View className="flex-row items-center gap-2 mt-5 mb-2">
          {icon}
          <Text className="text-sm font-bold text-ink">{title}</Text>
        </View>
        {steps.map((s, i) => (
          <View key={i} className="bg-surface-raised rounded-2xl px-4 py-3 mb-2">
            <Text className="text-sm font-bold text-ink">{s.product}</Text>
            {s.instructions ? <Text className="text-sm text-ink mt-1">{s.instructions}</Text> : null}
            {s.frequency ? <Text className="text-xs text-ink-muted mt-1">Frequency: {s.frequency}</Text> : null}
            {s.notes ? <Text className="text-xs text-ink-muted mt-0.5">Note: {s.notes}</Text> : null}
          </View>
        ))}
      </>
    );
  };

  const am = byPeriod('AM');
  const pm = byPeriod('PM');
  const isEmpty = !routine || am.length + pm.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => nav.goBack()} hitSlop={10}><ChevronLeft size={26} color="#1B1B16" /></Pressable>
        <Text className="text-lg font-bold text-ink ml-2">My Skincare Routine</Text>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
        {loading ? (
          <Text className="text-muted">Loading…</Text>
        ) : isEmpty ? (
          <View className="items-center mt-16 px-6">
            <Sparkles size={40} color="#C9A227" />
            <Text className="text-sm text-ink-muted text-center mt-3">
              No routine yet — your provider will share one after your visit.
            </Text>
          </View>
        ) : (
          <>
            {routine?.updatedAt ? (
              <Text className="text-xs text-ink-muted mt-2">Updated {fmt(routine.updatedAt)}</Text>
            ) : null}
            <Section title="AM" icon={<Sun size={16} color="#C9A227" />} steps={am} />
            <Section title="PM" icon={<Moon size={16} color="#C9A227" />} steps={pm} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
