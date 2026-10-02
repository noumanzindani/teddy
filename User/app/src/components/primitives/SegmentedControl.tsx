import { View, Pressable, Text, ScrollView } from 'react-native';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  variant?: 'pill' | 'underline';
  scrollable?: boolean;
}

export function SegmentedControl<T extends string>({
  options, value, onChange, variant = 'pill', scrollable,
}: Props<T>) {
  const Wrapper: any = scrollable ? ScrollView : View;
  const wrapperProps = scrollable
    ? { horizontal: true, showsHorizontalScrollIndicator: false }
    : {};

  if (variant === 'underline') {
    return (
      <Wrapper {...wrapperProps} className="flex-row gap-6">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable key={o.value} onPress={() => onChange(o.value)} hitSlop={6}>
              <Text className={`text-base ${active ? 'text-ink font-semibold' : 'text-ink-muted'}`}>
                {o.label}
              </Text>
              {active && <View className="h-0.5 bg-sage-700 mt-2 rounded-full" />}
            </Pressable>
          );
        })}
      </Wrapper>
    );
  }

  return (
    <Wrapper {...wrapperProps} className="flex-row flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            className={`px-5 py-2 rounded-full border ${
              active ? 'bg-sage-600 border-sage-600' : 'bg-transparent border-sage-400'
            }`}
          >
            <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-ink-soft'}`}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </Wrapper>
  );
}
