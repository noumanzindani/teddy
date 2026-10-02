import { View, Text } from 'react-native';

interface Props {
  current: number; // 1-based
  total: number;
  showLabel?: boolean;
}

export function StepProgressBar({ current, total, showLabel = true }: Props) {
  return (
    <View className="w-full">
      <View className="flex-row gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            className={`flex-1 h-1.5 rounded-full ${i < current ? 'bg-sage-600' : 'bg-sage-300'}`}
          />
        ))}
      </View>
      {showLabel && (
        <Text className="text-sm text-ink-soft mt-2">
          Step {current} of {total}
        </Text>
      )}
    </View>
  );
}
