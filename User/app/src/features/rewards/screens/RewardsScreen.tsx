import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Bell, Coffee, Star, Award, Gift } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ProgressBar, GradientButton } from '@components/primitives';
import { api } from '@utils/api';

interface RewardsResponse {
  tier: string;
  pointsBalance: number;
  rewards: { id: string; name: string; pointsRequired: number; description?: string | null }[];
  transactions: { id: string; delta: number; reason: string; createdAt: string }[];
}

interface DisplayActivity {
  id: string;
  label: string;
  sub: string;
  date: string;
  icon: string;
}

const ACTIVITY_ICONS: Record<string, any> = {
  gift: Gift, coffee: Coffee, star: Star, award: Award,
};

function pickIcon(reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes('booking')) return 'coffee';
  if (r.includes('referral')) return 'star';
  if (r.includes('reward')) return 'gift';
  return 'award';
}

function mapTransaction(t: { id: string; delta: number; reason: string; createdAt: string }): DisplayActivity {
  return {
    id: t.id,
    label: t.reason,
    sub: t.delta > 0 ? `+${t.delta}` : `${t.delta}`,
    date: new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    icon: pickIcon(t.reason),
  };
}

export function RewardsScreen() {
  const nav = useNavigation();
  const [data, setData] = useState<RewardsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<RewardsResponse>('/users/me/rewards')
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pointsBalance = data?.pointsBalance ?? 0;
  const activity: DisplayActivity[] = data ? data.transactions.map(mapTransaction) : [];
  const rewardsList = data?.rewards ?? [];
  const progressValue = (pointsBalance % 500) / 500;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <View className="flex-row items-center">
          <Pressable onPress={() => nav.goBack()} hitSlop={10} className="mr-3">
            <ChevronLeft size={26} color="#1B1B16" />
          </Pressable>
          <Text className="text-2xl font-bold text-ink">Rewards</Text>
        </View>
        <Pressable hitSlop={10}><Bell size={22} color="#1B1B16" /></Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3A6FB1" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          <View className="px-5">
            <Text className="text-xs text-ink-muted uppercase tracking-wider">Current Balance</Text>
            <Text className="text-5xl font-bold text-ink mt-1">{pointsBalance.toLocaleString()}</Text>
            <Text className="text-sm text-ink-muted mt-0.5">PTS</Text>

            <View className="mt-4">
              <ProgressBar value={progressValue} />
              <Text className="text-xs text-ink-muted mt-1.5">
                {500 - (pointsBalance % 500)} more points to next milestone
              </Text>
            </View>
          </View>

          <Text className="px-5 mt-7 text-base font-bold text-ink mb-2">Points Activity</Text>
          <View className="mx-5 bg-surface-raised rounded-2xl px-4">
            {activity.map((a, i) => {
              const Icon = ACTIVITY_ICONS[a.icon] ?? Award;
              const isLast = i === activity.length - 1;
              return (
                <View key={a.id} className={`flex-row py-3 ${isLast ? '' : 'border-b border-sage-200'}`}>
                  <View className="w-9 h-9 rounded-full bg-sage-300 items-center justify-center mr-3">
                    <Icon size={16} color="#1B1B16" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-ink">{a.label}</Text>
                    <Text className="text-xs text-ink-muted mt-0.5" numberOfLines={1}>{a.sub}</Text>
                    <Text className="text-[10px] text-ink-subtle mt-0.5">{a.date}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View className="mx-5 mt-5 bg-sage-700 rounded-2xl p-5">
            <Text className="text-base font-bold text-white">Share The Glow</Text>
            <Text className="text-sm text-white/90 mt-1.5 leading-5">
              Invite your circle to experience the wellness lifestyle. Affiliated members can earn bonus points by referring friends.
            </Text>
            <View className="mt-4 self-start">
              <GradientButton label="Invite Friend" size="md" />
            </View>
          </View>

          <Text className="px-5 mt-6 text-base font-bold text-ink mb-3">Exquisite Rewards</Text>
          <View className="px-5 gap-3">
            {rewardsList.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => (nav as any).navigate('RewardDetail', { rewardId: r.id })}
                className="bg-surface-raised rounded-2xl p-3 flex-row items-center active:opacity-90"
              >
                <View className="w-16 h-16 rounded-xl bg-sage-300 items-center justify-center">
                  <Award size={26} color="#1B1B16" />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-base font-bold text-ink">{r.name}</Text>
                  <Text className="text-xs text-ink-muted mt-0.5">
                    {r.description ?? 'A premium reward worth your points.'}
                  </Text>
                </View>
                <Text className="text-base font-bold text-ink">{r.pointsRequired} PTS</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
