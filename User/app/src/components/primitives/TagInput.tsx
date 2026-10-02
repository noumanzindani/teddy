import { View, Text, Pressable, TextInput } from 'react-native';
import { useState } from 'react';
import { X } from 'lucide-react-native';

interface Props {
  placeholder?: string;
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ placeholder = 'Type here', tags, onChange }: Props) {
  const [draft, setDraft] = useState('');

  const submit = () => {
    const t = draft.trim();
    if (!t || tags.includes(t)) {
      setDraft('');
      return;
    }
    onChange([...tags, t]);
    setDraft('');
  };

  return (
    <View className="w-full">
      <View className="bg-surface-input rounded-full px-5 py-3.5">
        <TextInput
          placeholderTextColor="#6B6B62"
          placeholder={placeholder}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          returnKeyType="done"
          className="text-ink text-base"
        />
      </View>
      {tags.length > 0 && (
        <View className="flex-row flex-wrap gap-2 mt-3">
          {tags.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => onChange(tags.filter((t) => t !== tag))}
              className="flex-row items-center bg-surface-card px-3 py-1.5 rounded-full border border-sage-300"
            >
              <Text className="text-sm text-ink mr-1.5">{tag}</Text>
              <X size={14} color="#1B1B16" />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
