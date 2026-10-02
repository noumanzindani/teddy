import { TextInput, TextInputProps, View } from 'react-native';

export function TextArea(props: TextInputProps) {
  return (
    <View className="bg-surface-input rounded-2xl px-4 py-3 min-h-[100px]">
      <TextInput
        placeholderTextColor="#6B6B62"
        multiline
        textAlignVertical="top"
        className="text-ink text-base"
        {...props}
      />
    </View>
  );
}
