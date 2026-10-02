import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Paperclip, Send, Check } from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useState, useEffect, useRef } from 'react';
import type { RootStackParamList } from '@navigation/types';
import { api } from '@utils/api';

type R = RouteProp<RootStackParamList, 'ChatThread'>;

interface ApiMessage {
  id: string;
  content: string;
  senderRole: string;
  createdAt: string;
}

interface DisplayMessage {
  id: string;
  from: 'user' | 'salon' | 'divider';
  text: string;
  time: string;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function mapApiMessage(m: ApiMessage): DisplayMessage {
  return {
    id: m.id,
    from: m.senderRole === 'client' ? 'user' : 'salon',
    text: m.content,
    time: formatTime(m.createdAt),
  };
}

export function ChatThreadScreen() {
  const nav = useNavigation();
  const route = useRoute<R>();
  const threadId = route.params?.threadId as string;

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [vendorName, setVendorName] = useState('');
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<any>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ id: string; vendor: { id: string; businessName: string }; messages: ApiMessage[] }>(
        '/chat/threads/' + threadId
      ),
      api.patch('/chat/threads/' + threadId + '/read', {}),
    ])
      .then(([thread]) => {
        setVendorName(thread.vendor.businessName);
        setMessages(thread.messages.map(mapApiMessage));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [threadId]);

  async function handleSend() {
    const content = draft.trim();
    if (!content) return;
    setDraft('');
    const optimisticId = `opt-${Date.now()}`;
    const optimistic: DisplayMessage = {
      id: optimisticId,
      from: 'user',
      text: content,
      time: formatTime(new Date().toISOString()),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const sent = await api.post<ApiMessage>('/chat/threads/' + threadId + '/messages', { content });
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? mapApiMessage(sent) : m))
      );
    } catch {
      // keep optimistic message on failure
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        {/* Header */}
        <View className="bg-sage-600 pt-3 pb-5 px-5 rounded-b-3xl flex-row items-center">
          <Pressable onPress={() => nav.goBack()} hitSlop={10} className="mr-3">
            <ChevronLeft size={26} color="#FFF" />
          </Pressable>
          <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3">
            <Text className="text-sage-700 text-sm font-bold">
              {vendorName.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <Text className="text-base font-bold text-white flex-1">{vendorName}</Text>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3A6FB1" />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            className="flex-1 px-5 py-4"
            contentContainerStyle={{ gap: 8 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.map((m) => {
              if (m.from === 'divider') {
                return (
                  <View key={m.id} className="items-center my-2">
                    <View className="bg-surface-input px-4 py-1 rounded-full">
                      <Text className="text-xs text-ink-muted">{m.text}</Text>
                    </View>
                  </View>
                );
              }
              const isUser = m.from === 'user';
              return (
                <View
                  key={m.id}
                  className={`max-w-[80%] ${isUser ? 'self-end' : 'self-start'}`}
                >
                  <View
                    className={`rounded-2xl px-4 py-2.5 ${
                      isUser ? 'bg-sage-600' : 'bg-surface-raised'
                    }`}
                  >
                    <Text className={`text-sm ${isUser ? 'text-white' : 'text-ink'} leading-5`}>{m.text}</Text>
                    <View className="flex-row items-center justify-end mt-1">
                      <Text className={`text-[10px] ${isUser ? 'text-white/70' : 'text-ink-muted'}`}>{m.time}</Text>
                      {isUser && <Check size={10} color="#3A6FB1" style={{ marginLeft: 3 }} />}
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        <View className="px-4 pb-2 pt-2 flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center bg-surface-input rounded-full px-4 py-2.5">
            <Paperclip size={16} color="#1B1B16" />
            <TextInput
              placeholder="Type here..."
              placeholderTextColor="#6B6B62"
              value={draft}
              onChangeText={setDraft}
              className="ml-2 flex-1 text-base text-ink"
            />
          </View>
          <Pressable onPress={handleSend} className="w-11 h-11 rounded-full items-center justify-center active:opacity-80">
            <Send size={22} color="#1B1B16" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
