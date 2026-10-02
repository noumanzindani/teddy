import { View, Text, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Menu, Plus, Edit3 } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { Badge, SegmentedControl, ProgressBar, GradientButton } from '@components/primitives';
import { QuickActionRow } from '../components/QuickActionRow';
import { MiniCalendar } from '../components/MiniCalendar';
import { recommendedGoals } from '@mock/index';
import { useGoals, useReminders, useUser } from '@store/index';
import { api } from '@utils/api';

type Nav = DrawerNavigationProp<any> & { navigate: (s: string, p?: any) => void };
type GoalTab = 'personal' | 'weekly' | 'professional';

interface ApiBooking {
  id: string;
  status: string;
  startsAt: string;
  service: { name: string; durationMin: number };
  vendor: { businessName: string };
}

const UPCOMING_STATUSES = new Set(['PENDING', 'CONFIRMED', 'IN_PROGRESS']);

export function HomeScreen() {
  const nav = useNavigation<Nav>();
  const [goalTab, setGoalTab] = useState<GoalTab>('personal');
  const user = useUser();
  const pointsBadge = user.points;

  const goals = useGoals((s) => s.goals);
  const reminders = useReminders((s) => s.reminders);
  const visibleGoals = goals.filter((g) => g.category === goalTab);

  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  useEffect(() => {
    api.get<ApiBooking[]>('/users/me/bookings')
      .then((data) => {
        const upcoming = data.filter((b) => UPCOMING_STATUSES.has(b.status));
        setBookings(upcoming);
      })
      .catch(() => {})
      .finally(() => setBookingsLoading(false));
  }, []);

  const apptDates = new Set(bookings.map((b) => b.startsAt.slice(0, 10)));

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
          <View className="flex-row items-center flex-1">
            <Pressable onPress={() => nav.openDrawer?.()} hitSlop={10} className="mr-3">
              <Menu size={24} color="#1B1B16" />
            </Pressable>
            <View>
              <Text className="text-xs text-ink-muted">Good afternoon 👋</Text>
              <Text className="text-lg font-semibold text-ink">{user.name}</Text>
            </View>
            <Pressable onPress={() => nav.navigate('Rewards')} className="ml-3">
              <Badge label={`${pointsBadge.toLocaleString()} PTS`} tone="gold" />
            </Pressable>
          </View>
          <Pressable onPress={() => nav.navigate('Notifications')} hitSlop={10}>
            <Bell size={22} color="#1B1B16" />
          </Pressable>
        </View>

        <View className="px-5">
          <QuickActionRow
            onJournal={() => nav.navigate('Journal')}
            onMood={() => nav.navigate('MoodJournal')}
            onReminder={() => nav.navigate('AddReminder')}
            onReferral={() => nav.navigate('ReferFriend')}
          />
        </View>

        <View className="px-5 mt-6">
          <MiniCalendar appointmentDates={apptDates} />
        </View>

        {/* Upcoming appointments */}
        <View className="px-5 mt-4 gap-2">
          {bookingsLoading ? (
            <View className="bg-surface-raised rounded-2xl p-4">
              <View className="h-5 bg-sage-200 rounded-full w-3/4 mb-2" />
              <View className="h-4 bg-sage-200 rounded-full w-1/2" />
            </View>
          ) : (
            bookings.slice(0, 2).map((b) => {
              const dateStr = new Date(b.startsAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              });
              const timeStr = new Date(b.startsAt).toLocaleTimeString('en-US', {
                hour: 'numeric', minute: '2-digit',
              });
              return (
                <View key={b.id} className="bg-surface-raised rounded-2xl p-4 flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-semibold text-ink">{dateStr} at {timeStr}</Text>
                    <Text className="text-sm text-ink-muted mt-0.5">{b.service.name}</Text>
                  </View>
                  <View className="border border-sage-300 rounded-full px-3 py-1">
                    <Text className="text-xs text-ink-soft">Est. Duration {b.service.durationMin} min</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Smart Reminder */}
        <View className="px-5 mt-6">
          <Text className="text-lg font-bold text-ink mb-3">Smart Reminder</Text>
          <View className="bg-surface-raised rounded-2xl p-4">
            <Text className="text-sm text-ink-soft leading-5">
              You usually journal at night. Want me to remind you at 9 PM?
            </Text>
            <Pressable className="mt-3 self-start">
              <LinearGradient
                colors={['#B89766', '#E0C58A']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 }}
              >
                <Text className="text-sm font-semibold text-ink">Set Reminder</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {/* Goals */}
        <View className="px-5 mt-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-ink">Your Goals</Text>
            <Pressable onPress={() => nav.navigate('NewGoal')} hitSlop={10}>
              <Plus size={22} color="#1B1B16" />
            </Pressable>
          </View>
          <View className="mb-4">
            <SegmentedControl
              variant="underline"
              value={goalTab}
              onChange={setGoalTab}
              options={[
                { value: 'personal', label: 'Personal' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'professional', label: 'Professional' },
              ]}
            />
          </View>

          <View className="bg-surface-raised rounded-2xl p-4 gap-4">
            {visibleGoals.map((g) => (
              <Pressable key={g.id} onPress={() => nav.navigate('GoalDetails', { goalId: g.id })}>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-base font-semibold text-ink flex-1">{g.title}</Text>
                  {g.completed ? (
                    <View className="flex-row items-center">
                      <View className="w-4 h-4 rounded-full bg-success items-center justify-center mr-1.5">
                        <Text className="text-white text-[9px] leading-3">✓</Text>
                      </View>
                      <Text className="text-xs font-bold text-ink-soft tracking-wider">COMPLETED</Text>
                    </View>
                  ) : g.streak >= 5 ? (
                    <Text className="text-xs font-bold text-warning tracking-wider">🔥 {g.streak} DAYS STREAK</Text>
                  ) : g.count != null ? (
                    <Text className="text-sm text-ink-muted">Count: {g.count}</Text>
                  ) : null}
                </View>
                <ProgressBar value={g.progress} />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Reminders */}
        <View className="px-5 mt-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-ink">Reminder</Text>
            <Pressable onPress={() => nav.navigate('AddReminder')} hitSlop={10}>
              <Plus size={22} color="#1B1B16" />
            </Pressable>
          </View>
          <View className="bg-surface-raised rounded-2xl p-4 gap-3">
            {reminders.map((r) => (
              <View key={r.id} className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-1 h-10 bg-sage-600 rounded-full mr-3" />
                  <View>
                    <Text className="text-xs text-ink-muted">{r.time}</Text>
                    <Text className="text-base font-semibold text-ink">{r.title}</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => nav.navigate('EditReminder', { reminderId: r.id })}
                  hitSlop={10}
                >
                  <Edit3 size={18} color="#1B1B16" />
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* Recommended goal */}
        <View className="px-5 mt-8">
          <Text className="text-lg font-bold text-ink mb-3">Recommended for You</Text>
          {recommendedGoals.slice(0, 1).map((rg) => (
            <View key={rg.id} className="bg-surface-raised rounded-2xl p-4">
              <Text className="text-base font-semibold text-ink">{rg.title}</Text>
              <Text className="text-sm text-ink-muted mt-1">{rg.description}</Text>
              <View className="flex-row gap-2 mt-3">
                <View className="border border-sage-300 rounded-full px-3 py-1">
                  <Text className="text-xs text-ink-soft">Duration: {rg.durationDays} Days</Text>
                </View>
                <View className="border border-sage-300 rounded-full px-3 py-1">
                  <Text className="text-xs text-ink-soft">Tasks: {rg.tasksPerDay} per day</Text>
                </View>
              </View>
              <View className="mt-4">
                <Pressable className="border border-sage-300 rounded-full py-3 items-center">
                  <Text className="text-base text-ink-muted">Start Goal</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* Refer Friends banner */}
        <View className="px-5 mt-6">
          <Pressable
            onPress={() => nav.navigate('ReferFriend')}
            className="rounded-2xl overflow-hidden bg-sage-700 p-5 flex-row items-center active:opacity-90"
          >
            <View className="flex-1 pr-3">
              <Text className="text-lg font-bold text-white">Refer Friends</Text>
              <Text className="text-sm text-white/80 mt-1">Earn 100 points per referral</Text>
              <View className="mt-3 self-start">
                <View className="bg-white rounded-full px-4 py-2">
                  <Text className="text-sm font-semibold text-ink">Get Started</Text>
                </View>
              </View>
            </View>
            <Text style={{ fontSize: 64 }}>👋</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
