import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, BellOff } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@utils/api';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

export function NotificationsScreen() {
  const nav = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.get<Notification[]>('/notifications');
      setNotifications(data);
    } catch {
      // silently ignore — show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function handleMarkAllRead() {
    try {
      await api.patch('/notifications/read-all', {});
      await fetchNotifications();
    } catch {
      // ignore
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <View className="flex-row items-center">
          <Pressable onPress={() => nav.goBack()} hitSlop={10} className="mr-3">
            <ChevronLeft size={26} color="#1B1B16" />
          </Pressable>
          <Text className="text-2xl font-bold text-ink">Notifications</Text>
        </View>
        <Pressable hitSlop={10} className="flex-row items-center" onPress={handleMarkAllRead}>
          <BellOff size={16} color="#1B1B16" />
          <Text className="ml-1.5 text-sm font-medium text-ink">Mark all read</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1B1B16" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {notifications.map((n) => (
            <View key={n.id} className="bg-surface-raised rounded-2xl p-4 mb-3">
              <View className="flex-row items-start justify-between">
                <Text className="text-base font-bold text-ink flex-1 pr-2">{n.title}</Text>
                <Text className="text-xs text-ink-muted">{formatRelative(n.createdAt)}</Text>
              </View>
              <Text className="text-sm text-ink-soft mt-1.5 leading-5">{n.body}</Text>
              {n.type === 'BOOKING_COMPLETED' && (
                <Pressable
                  onPress={() => (nav as any).navigate('RateExperience', { bookingId: n.id })}
                  className="self-start mt-3 bg-sage-700 rounded-full px-4 py-1.5 active:opacity-80"
                >
                  <Text className="text-xs font-semibold text-white">Rate Now</Text>
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
