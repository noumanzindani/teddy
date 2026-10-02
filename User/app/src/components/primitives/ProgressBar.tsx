import { View } from 'react-native';

export function ProgressBar({ value, color = '#7E8A6E', height = 6 }: { value: number; color?: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View className="w-full bg-sage-300 rounded-full overflow-hidden" style={{ height }}>
      <View style={{ width: `${pct * 100}%`, height, backgroundColor: color, borderRadius: 999 }} />
    </View>
  );
}
