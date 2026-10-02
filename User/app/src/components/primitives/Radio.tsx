import { View, Text, Pressable } from 'react-native';

interface Props {
  options: { value: string; label: string }[];
  value?: string;
  onChange: (v: string) => void;
  columns?: 1 | 2;
}

export function RadioGroup({ options, value, onChange, columns = 2 }: Props) {
  return (
    <View className="flex-row flex-wrap gap-y-3">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className="flex-row items-center"
            style={{ width: columns === 2 ? '50%' : '100%' }}
            hitSlop={4}
          >
            <View
              className={`w-5 h-5 rounded-full border-2 ${selected ? 'border-sage-700' : 'border-sage-400'} items-center justify-center`}
            >
              {selected && <View className="w-2.5 h-2.5 rounded-full bg-sage-700" />}
            </View>
            <Text className="ml-2.5 text-base text-ink">{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
