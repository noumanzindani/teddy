import { View, Text, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { useJournal } from '@store/index';

export function AddJournalScreen() {
  const nav = useNavigation();
  const add = useJournal((s) => s.add);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const save = () => {
    if (title.trim() || body.trim()) {
      add({ title: title || 'Untitled', body: body || title });
    }
    nav.goBack();
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
          <Pressable onPress={() => nav.goBack()} hitSlop={10}>
            <ChevronLeft size={26} color="#1B1B16" />
          </Pressable>
          <Pressable onPress={save} hitSlop={10}>
            <Text className="text-base font-bold text-ink">Done</Text>
          </Pressable>
        </View>

        <View className="px-5 pt-4 flex-1">
          <TextInput
            placeholder="Title"
            placeholderTextColor="#9A9A91"
            value={title}
            onChangeText={setTitle}
            className="text-4xl font-bold text-ink mb-2"
          />
          <TextInput
            placeholder="Start Typing ..."
            placeholderTextColor="#9A9A91"
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
            className="flex-1 text-base text-ink-soft"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
