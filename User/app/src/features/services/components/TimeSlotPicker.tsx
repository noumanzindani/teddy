import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Star, Coffee } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { MiniCalendar } from '@features/home/components/MiniCalendar';
import { GradientButton } from '@components/primitives';
import { services, salons } from '@mock/index';

const SLOTS = ['11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM'];
const UNAVAILABLE = new Set([1, 4, 6]); // indexes in the doubled list

interface Props {
  title: string;
  serviceId: string;
  ctaLabel: string;
  onContinue: (date: string, time: string) => void;
  onJoinWaitlist?: (date: string) => void;
  loading?: boolean;
  error?: string | null;
}

export function TimeSlotPicker({ title, serviceId, ctaLabel, onContinue, onJoinWaitlist, loading, error }: Props) {
  const nav = useNavigation();
  const service = services.find((s) => s.id === serviceId) ?? services[0];
  const salon = salons.find((s) => s.id === service.salonId);
  const [date, setDate] = useState<string>();
  const [slot, setSlot] = useState<string>();

  // The slot id is `${row}-${col}`; the row index maps back to the real clock
  // time in SLOTS so downstream consumers receive a parseable time (e.g. "12:00 PM").
  const selectedTime = slot ? SLOTS[Number(slot.split('-')[0])] ?? SLOTS[0] : undefined;

  // Determine if all slots are unavailable for the selected date
  // In production this comes from API; here we simulate: if no date picked,
  // slots show normally; once a date is picked we keep the same UNAVAILABLE set.
  const allUnavailable = date ? SLOTS.every((_, i) => UNAVAILABLE.has(i)) : false;

  // Two-column layout: pair slots in pairs of 2
  const slotPairs: (string | null)[][] = [];
  for (let i = 0; i < SLOTS.length; i++) {
    slotPairs.push([SLOTS[i], SLOTS[i]]);
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 220 }}>
        <View className="flex-row items-center px-5 pt-4 pb-3">
          <Pressable onPress={() => nav.goBack()} hitSlop={10} className="mr-3">
            <ChevronLeft size={26} color="#1B1B16" />
          </Pressable>
          <Text className="text-xl font-bold text-ink flex-1 text-center">{title}</Text>
          <View style={{ width: 26 }} />
        </View>

        <View className="px-5">
          <MiniCalendar onSelectDate={setDate} />
        </View>

        <View className="px-5 mt-4 gap-3">
          {slotPairs.map((pair, row) =>
            <View key={row} className="flex-row gap-3">
              {pair.map((s, col) => {
                if (!s) return <View key={col} className="flex-1" />;
                const idx = row * 2 + col;
                const unavailable = UNAVAILABLE.has(idx);
                const id = `${row}-${col}`;
                const selected = slot === id;
                return (
                  <Pressable
                    key={col}
                    disabled={unavailable}
                    onPress={() => setSlot(id)}
                    className={`flex-1 rounded-full py-3 items-center ${
                      selected ? 'bg-sage-700' : unavailable ? 'bg-surface-raised opacity-50' : 'bg-surface-raised'
                    }`}
                  >
                    <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-ink'}`}>{s}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View className="px-5 mt-6">
          <View className="bg-surface-raised rounded-2xl overflow-hidden">
            <View className="relative">
              <Image source={{ uri: service.imageUrl }} style={{ width: '100%', height: 160 }} resizeMode="cover" />
              <View className="absolute top-3 right-3 bg-white/95 rounded-full px-3 py-1">
                <Text className="text-xs text-ink font-medium">Est. Duration {service.durationMin} min</Text>
              </View>
              {salon && (
                <View className="absolute bottom-3 left-3 bg-white/95 rounded-full pl-1.5 pr-3 py-1 flex-row items-center">
                  <View className="w-7 h-7 rounded-full bg-sage-700 items-center justify-center mr-2">
                    <Coffee size={14} color="#FFF" />
                  </View>
                  <Text className="text-xs font-semibold text-ink">{salon.name}</Text>
                </View>
              )}
            </View>
            <View className="p-3 flex-row items-center justify-between">
              <Text className="text-base font-bold text-ink flex-1">{service.name}</Text>
              <View className="flex-row items-center">
                <Star size={14} color="#F5A623" fill="#F5A623" />
                <Text className="ml-1 text-sm font-semibold text-ink">{service.rating.toFixed(1)}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-3 bg-surface border-t border-sage-200">
        <View className="flex-row items-center justify-between mb-3">
          <View className="bg-sage-300 rounded-full px-3 py-1">
            <Text className="text-xs text-ink-soft">Distance {service.distanceKm} km away</Text>
          </View>
          <Text className="text-base text-ink-soft">
            From <Text className="text-lg font-bold text-ink">${service.price}</Text>
          </Text>
        </View>
        {/* If date chosen and all slots unavailable, offer waitlist */}
        {date && allUnavailable && onJoinWaitlist ? (
          <View className="gap-2">
            <View className="bg-gold-100 rounded-xl px-4 py-2.5">
              <Text className="text-xs text-gold-800 font-medium text-center">
                No slots available on this date.
              </Text>
            </View>
            <GradientButton
              label="Join Waitlist for This Date"
              onPress={() => onJoinWaitlist(date)}
            />
          </View>
        ) : (
          <>
            {error ? (
              <Text className="text-sm text-danger text-center mb-2">{error}</Text>
            ) : null}
            <GradientButton
              label={ctaLabel}
              disabled={!slot || loading}
              onPress={() => onContinue(date ?? '2026-01-15', selectedTime ?? SLOTS[0])}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
