import { Pressable, Text } from 'react-native';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
}

export function Chip({ label, selected, onPress, size = 'md' }: Props) {
  const padding = size === 'sm' ? 'px-3 py-1.5' : 'px-4 py-2';
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border ${padding} ${selected ? 'bg-sage-600 border-sage-600' : 'bg-surface-card border-sage-200'}`}
    >
      <Text className={`${size === 'sm' ? 'text-xs' : 'text-sm'} ${selected ? 'text-white' : 'text-ink-soft'} font-medium`}>{label}</Text>
    </Pressable>
  );
}
