import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useJournal } from '@store/index';
import { EmptyState } from '@components/primitives';

export function JournalScreen() {
  const nav = useNavigation();
  const entries = useJournal((s) => s.entries);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <Pressable onPress={() => nav.goBack()} hitSlop={10}>
          <ChevronLeft size={26} color="#1B1B16" />
        </Pressable>
        <Text className="text-xl font-bold text-ink">Journal</Text>
        <Pressable onPress={() => (nav as any).navigate('AddJournal')} hitSlop={10}>
          <Plus size={24} color="#1B1B16" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {entries.length === 0 ? (
          <EmptyState
            title="No journal entries yet"
            description="Start writing today."
          />
        ) : (
          entries.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => (nav as any).navigate('JournalDetails', { entryId: e.id })}
              className="bg-surface-raised rounded-2xl p-4 mb-3 active:opacity-80"
            >
              <Text className="text-base font-bold text-ink mb-1">{e.preview.split('.')[0] || 'Note'}</Text>
              <Text className="text-sm text-ink-soft" numberOfLines={2}>{e.body}</Text>
              <Text className="text-xs text-ink-subtle mt-2">{e.date}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
