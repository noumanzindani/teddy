import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, MoreVertical, Droplet, Flame, Plus, Check, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { CircularProgress } from '@components/primitives';
import { useGoals } from '@store/index';
import type { RootStackParamList } from '@navigation/types';

type R = RouteProp<RootStackParamList, 'GoalDetails'>;

export function GoalDetailsScreen() {
  const nav = useNavigation();
  const route = useRoute<R>();
  const goals = useGoals((s) => s.goals);
  const markProgress = useGoals((s) => s.markProgress);
  const markCompleted = useGoals((s) => s.markCompleted);

  const goal = goals.find((g) => g.id === route.params?.goalId) ?? goals[0];
  const progressPct = Math.round(goal.progress * 100);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <Pressable onPress={() => nav.goBack()} hitSlop={10}>
          <ChevronLeft size={26} color="#1B1B16" />
        </Pressable>
        <Text className="text-xl font-bold text-ink">Goal Details</Text>
        <Pressable hitSlop={10}>
          <MoreVertical size={22} color="#1B1B16" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        <View className="items-center mt-4">
          <View className="w-16 h-16 rounded-2xl bg-sage-300 items-center justify-center">
            <Droplet size={28} color="#1B1B16" />
          </View>
          <Text className="text-2xl font-bold text-ink mt-4">{goal.title}</Text>
          <Text className="text-sm text-ink-muted mt-1">Daily Target</Text>
        </View>

        <View className="bg-surface-raised rounded-2xl p-6 mt-6 items-center">
          <CircularProgress
            value={goal.progress}
            size={200}
            strokeWidth={10}
            labelPrimary={`${progressPct}%`}
            labelSecondary="COMPLETED"
          />
          <View className="bg-sage-300 rounded-full px-4 py-2.5 flex-row items-center justify-between mt-6 w-full">
            <Text className="text-base font-semibold text-ink">Progressive Milestone</Text>
            <Text className="text-sm text-ink-muted">5 / 6 Units</Text>
          </View>
        </View>

        <View className="bg-surface-raised rounded-2xl p-4 mt-4 flex-row items-center">
          <View className="w-12 h-12 rounded-2xl bg-sage-300 items-center justify-center mr-3">
            <Flame size={22} color="#1B1B16" />
          </View>
          <View>
            <Text className="text-sm text-ink-muted">Current Streak</Text>
            <View className="flex-row items-baseline">
              <Text className="text-xl font-bold text-ink">{goal.streak} Days</Text>
              <Text className="text-sm text-warning ml-3 font-semibold">Personal Best!</Text>
            </View>
          </View>
        </View>

        <Pressable onPress={() => markProgress(goal.id)} className="mt-4 active:opacity-90">
          <LinearGradient
            colors={['#B89766', '#E0C58A']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ borderRadius: 999, paddingVertical: 14 }}
          >
            <View className="flex-row items-center justify-center">
              <View className="w-6 h-6 rounded-full bg-ink items-center justify-center mr-2">
                <Plus size={14} color="#FFF" />
              </View>
              <Text className="text-base font-semibold text-ink">Mark Progress (+1)</Text>
            </View>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() => markCompleted(goal.id)}
          className="mt-3 border border-sage-400 rounded-full py-3.5 items-center flex-row justify-center active:opacity-80"
        >
          <Check size={16} color="#9A9A91" />
          <Text className="text-base text-ink-muted ml-2">Mark Completed</Text>
        </Pressable>

        <Text className="text-base font-bold text-ink mt-6 mb-3">Today's Log</Text>
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-xl bg-surface-raised items-center justify-center mr-3">
            <Clock size={18} color="#1B1B16" />
          </View>
          <View>
            <Text className="text-base font-semibold text-ink">1 Glass added</Text>
            <Text className="text-xs text-ink-muted">11:45 - Refreshment</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
