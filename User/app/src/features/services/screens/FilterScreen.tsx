import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star } from 'lucide-react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import RNSlider from '@react-native-community/slider';
import { GradientButton, TimePickerRow } from '@components/primitives';

const SERVICES = ['Hair', 'Nails', 'Massage', 'Skincare', 'Waxing', 'Makeup'];

interface SliderRowProps {
  value: number;
  onChange: (v: number) => void;
  max: number;
  label: string;
  prefix?: string;
  suffix?: string;
}

function SliderRow({ value, onChange, max, label, prefix = '', suffix = '' }: SliderRowProps) {
  return (
    <View>
      <View className="flex-row items-end justify-between mb-2">
        <Text className="text-sm font-bold text-ink">{label}</Text>
        <Text className="text-sm font-semibold text-ink-soft">
          {prefix}{Math.round(value)}{suffix}
        </Text>
      </View>
      <View className="flex-row items-center">
        <Text className="text-xs text-ink-muted w-10">{prefix}0{suffix}</Text>
        <View className="flex-1 mx-2">
          <RNSlider
            minimumValue={0}
            maximumValue={max}
            value={value}
            onValueChange={onChange}
            minimumTrackTintColor="#5F6B52"
            maximumTrackTintColor="#C5C2A8"
            thumbTintColor="#5F6B52"
          />
        </View>
        <Text className="text-xs text-ink-muted text-right">{prefix}{max}{suffix}</Text>
      </View>
    </View>
  );
}

export function FilterScreen() {
  const nav = useNavigation();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rating, setRating] = useState(3);
  const [price, setPrice] = useState(50);
  const [distance, setDistance] = useState(20);
  const [dateTime, setDateTime] = useState(new Date());

  const toggle = (s: string) => {
    const n = new Set(selected);
    n.has(s) ? n.delete(s) : n.add(s);
    setSelected(n);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
      <View className="items-center pt-3 pb-2">
        <View className="w-10 h-1 rounded-full bg-sage-700" />
      </View>

      <View className="px-6 pt-2">
        <Text className="text-3xl font-bold text-ink mb-5">Filter</Text>

        <Text className="text-sm font-bold text-ink mb-3">Services</Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {SERVICES.map((s) => {
            const active = selected.has(s);
            return (
              <Pressable
                key={s}
                onPress={() => toggle(s)}
                className={`px-3 py-1.5 rounded-full border ${
                  active ? 'bg-sage-600 border-sage-600' : 'bg-transparent border-sage-400'
                }`}
              >
                <Text className={`text-sm ${active ? 'text-white' : 'text-ink-soft'}`}>{s}</Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mb-5">
          <SliderRow value={price} onChange={setPrice} max={100} label="Price range" prefix="$" suffix="k" />
        </View>
        <View className="mb-5">
          <SliderRow value={distance} onChange={setDistance} max={100} label="Distance" suffix=" Mi" />
        </View>

        <Text className="text-sm font-bold text-ink mb-3">Rating</Text>
        <View className="bg-surface-raised rounded-2xl flex-row items-center justify-around py-3 mb-6">
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} hitSlop={6}>
              <Star size={26} color={n <= rating ? '#F5A623' : '#9A9A91'} fill={n <= rating ? '#F5A623' : 'transparent'} />
            </Pressable>
          ))}
        </View>

        <Text className="text-sm font-bold text-ink mb-3">Date & Time</Text>
        <View className="mb-8">
          <TimePickerRow value={dateTime} onChange={setDateTime} mode="datetime" label="Date & Time" />
        </View>

        <GradientButton label="Apply" onPress={() => nav.goBack()} />
      </View>
    </SafeAreaView>
  );
}
