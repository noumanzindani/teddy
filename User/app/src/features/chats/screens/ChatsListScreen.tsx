import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Menu, MoreVertical, Pin, Check } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { EmptyState } from '@components/primitives';
import { api } from '@utils/api';

type Nav = DrawerNavigationProp<any> & { navigate: (s: string, p?: any) => void };

interface ApiThread {
  id: string;
  vendor: { id: string; businessName: string };
  lastMessage?: { content: string; createdAt: string; senderRole: string } | null;
  unreadCount?: number;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ChatsListScreen() {
  const nav = useNavigation<Nav>();
  const [threads, setThreads] = useState<ApiThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ApiThread[]>('/chat/threads')
      .then((data) => setThreads(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <View className="flex-row items-center">
          <Pressable onPress={() => nav.openDrawer?.()} hitSlop={10} className="mr-3">
            <Menu size={24} color="#1B1B16" />
          </Pressable>
          <Text className="text-2xl font-bold text-ink">Chats</Text>
        </View>
        <Pressable onPress={() => nav.navigate('Notifications')} hitSlop={10}>
          <Bell size={22} color="#1B1B16" />
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3A6FB1" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {threads.length === 0 ? (
            <EmptyState
              title="No messages yet"
              description="After you book, salons can send you updates here."
            />
          ) : (
            threads.map((t, i) => {
              const salonName = t.vendor.businessName;
              const lastMessage = t.lastMessage?.content ?? '';
              const lastTimestamp = t.lastMessage?.createdAt ? relativeTime(t.lastMessage.createdAt) : '';
              const unreadCount = t.unreadCount ?? 0;

              return (
                <Pressable
                  key={t.id}
                  onPress={() => nav.navigate('ChatThread', { threadId: t.id })}
                  className="px-5 py-3 active:bg-sage-100 flex-row items-center"
                >
                  <View className="w-12 h-12 rounded-full bg-sage-700 items-center justify-center mr-3">
                    <Text className="text-white text-sm font-bold">{salonName.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-base font-bold text-ink flex-1">{salonName}</Text>
                      <Text className="text-xs text-ink-muted ml-2">{lastTimestamp}</Text>
                    </View>
                    <View className="flex-row items-center mt-0.5">
                      <Text className="text-sm text-ink-soft flex-1" numberOfLines={1}>
                        {lastMessage}
                      </Text>
                      <View className="flex-row items-center ml-2">
                        {unreadCount > 0 ? (
                          <View className="w-5 h-5 rounded-full bg-sage-700 items-center justify-center">
                            <Text className="text-[10px] font-bold text-white">{unreadCount}</Text>
                          </View>
                        ) : i === 0 ? (
                          <Pin size={12} color="#6B6B62" />
                        ) : null}
                        <View className="ml-1.5">
                          <Check size={14} color="#3A6FB1" />
                        </View>
                      </View>
                    </View>
                  </View>
                  <Pressable hitSlop={6} className="ml-2">
                    <MoreVertical size={18} color="#1B1B16" />
                  </Pressable>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
