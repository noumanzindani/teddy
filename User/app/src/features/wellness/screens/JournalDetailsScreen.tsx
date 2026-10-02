import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Edit2, Trash2 } from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useJournal } from '@store/index';
import type { RootStackParamList } from '@navigation/types';

type R = RouteProp<RootStackParamList, 'JournalDetails'>;

export function JournalDetailsScreen() {
  const nav = useNavigation();
  const route = useRoute<R>();
  const entries = useJournal((s) => s.entries);
  const remove = useJournal((s) => s.remove);
  const entry = entries.find((e) => e.id === route.params?.entryId) ?? entries[0];

  const handleDelete = () => {
    if (entry) remove(entry.id);
    nav.goBack();
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <Pressable onPress={() => nav.goBack()} hitSlop={10}>
          <ChevronLeft size={26} color="#1B1B16" />
        </Pressable>
        <View className="flex-row gap-5">
          <Pressable hitSlop={10}><Edit2 size={20} color="#1B1B16" /></Pressable>
          <Pressable onPress={handleDelete} hitSlop={10}><Trash2 size={20} color="#C44545" /></Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 }}>
        <Text className="text-sm text-ink-muted">{entry?.date ?? ''}</Text>
        <Text className="text-3xl font-bold text-ink mt-2">{entry?.preview.split('.')[0] || 'Note'}</Text>
        <Text className="text-base text-ink-soft mt-4 leading-6">{entry?.body}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
