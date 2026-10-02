import { View, Text, Pressable } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

interface Props {
  value?: string;
  placeholder?: string;
  onPress?: () => void;
}

export function PillSelect({ value, placeholder = 'Type here', onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between bg-surface-input rounded-full px-5 py-3.5 active:opacity-80"
    >
      <Text className={`text-base ${value ? 'text-ink' : 'text-ink-muted'}`}>
        {value ?? placeholder}
      </Text>
      <ChevronDown size={18} color="#1B1B16" />
    </Pressable>
  );
}
