import { View, Text } from 'react-native';

type Tone = 'gold' | 'sage' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<Tone, { bg: string; fg: string }> = {
  gold:    { bg: 'bg-gold-200',   fg: 'text-gold-800' },
  sage:    { bg: 'bg-sage-200',   fg: 'text-sage-800' },
  success: { bg: 'bg-green-100',  fg: 'text-success' },
  warning: { bg: 'bg-orange-100', fg: 'text-warning' },
  danger:  { bg: 'bg-red-100',    fg: 'text-danger' },
  info:    { bg: 'bg-blue-100',   fg: 'text-info' },
};

export function Badge({ label, tone = 'sage' }: { label: string; tone?: Tone }) {
  const t = tones[tone];
  return (
    <View className={`${t.bg} px-2.5 py-1 rounded-full`}>
      <Text className={`${t.fg} text-xs font-semibold`}>{label}</Text>
    </View>
  );
}
