import { View, Text, Pressable, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Star, CheckCircle2 } from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useState } from 'react';
import { GradientButton } from '@components/primitives';
import type { RootStackParamList } from '@navigation/types';

type R = RouteProp<RootStackParamList, 'StaffSelection'>;

// TODO: fetch real staff from API once a client-facing endpoint exists.
// Candidate endpoint: GET /vendors/:vendorId/staff
// Until then, the mock list below is used.

interface StaffMember {
  id: string;
  name: string;
  title: string;
  rating: number;
  reviewCount: number;
  avatarUrl: string;
  specialties: string[];
}

const MOCK_STAFF: StaffMember[] = [
  {
    id: 'st1', name: 'Maya Johnson', title: 'Senior Esthetician',
    rating: 4.9, reviewCount: 142,
    avatarUrl: 'https://i.pravatar.cc/150?img=47',
    specialties: ['Facials', 'Chemical Peels', 'Microneedling'],
  },
  {
    id: 'st2', name: 'Sofia Reyes', title: 'Skin & Wellness Specialist',
    rating: 4.8, reviewCount: 98,
    avatarUrl: 'https://i.pravatar.cc/150?img=25',
    specialties: ['HydraFacial', 'LED Therapy', 'Extractions'],
  },
  {
    id: 'st3', name: 'Priya Nair', title: 'Certified Aesthetician',
    rating: 4.7, reviewCount: 67,
    avatarUrl: 'https://i.pravatar.cc/150?img=44',
    specialties: ['Waxing', 'Brow Shaping', 'Lash Tinting'],
  },
];

export function StaffSelectionScreen() {
  const nav = useNavigation();
  const route = useRoute<R>();
  const { serviceId, date, time, vendorId } = route.params;
  const [selected, setSelected] = useState<string | null>(null);

  function handleContinue() {
    (nav as any).navigate('SalonIntake', { serviceId, date, time, vendorId });
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-5 pt-4 pb-3">
        <Pressable onPress={() => nav.goBack()} hitSlop={10} className="mr-3">
          <ChevronLeft size={26} color="#1B1B16" />
        </Pressable>
        <Text className="text-xl font-bold text-ink flex-1 text-center">Choose Your Specialist</Text>
        <View style={{ width: 26 }} />
      </View>

      <Text className="text-sm text-ink-muted text-center mb-4">
        Select a specialist or skip to be assigned automatically
      </Text>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}>
        {/* Any specialist option */}
        <Pressable
          onPress={() => setSelected('any')}
          className={`bg-surface-raised rounded-2xl p-4 mb-3 flex-row items-center border-2 ${
            selected === 'any' ? 'border-sage-600' : 'border-transparent'
          }`}
        >
          <View className="w-14 h-14 rounded-full bg-sage-200 items-center justify-center mr-4">
            <Text className="text-xl">✨</Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-ink">Any Available Specialist</Text>
            <Text className="text-xs text-ink-muted mt-0.5">Assigned based on availability</Text>
          </View>
          {selected === 'any' && <CheckCircle2 size={20} color="#4A5E3A" />}
        </Pressable>

        {MOCK_STAFF.map((staff) => (
          <Pressable
            key={staff.id}
            onPress={() => setSelected(staff.id)}
            className={`bg-surface-raised rounded-2xl p-4 mb-3 border-2 ${
              selected === staff.id ? 'border-sage-600' : 'border-transparent'
            }`}
          >
            <View className="flex-row items-start">
              <Image
                source={{ uri: staff.avatarUrl }}
                style={{ width: 56, height: 56, borderRadius: 28, marginRight: 12 }}
              />
              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-bold text-ink">{staff.name}</Text>
                  {selected === staff.id && <CheckCircle2 size={20} color="#4A5E3A" />}
                </View>
                <Text className="text-xs text-ink-muted mt-0.5">{staff.title}</Text>
                <View className="flex-row items-center mt-1">
                  <Star size={12} color="#F5A623" fill="#F5A623" />
                  <Text className="text-xs font-semibold text-ink ml-1">{staff.rating}</Text>
                  <Text className="text-xs text-ink-muted ml-1">({staff.reviewCount} reviews)</Text>
                </View>
              </View>
            </View>
            <View className="flex-row flex-wrap gap-1.5 mt-3">
              {staff.specialties.map((s) => (
                <View key={s} className="bg-sage-100 rounded-full px-3 py-1">
                  <Text className="text-xs font-medium text-sage-700">{s}</Text>
                </View>
              ))}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-surface">
        <View className="flex-row gap-3">
          <Pressable
            onPress={handleContinue}
            className="flex-1 border border-sage-400 rounded-2xl py-3.5 items-center active:opacity-80"
          >
            <Text className="text-base font-semibold text-ink">Skip</Text>
          </Pressable>
          <View className="flex-1">
            <GradientButton
              label="Continue"
              onPress={handleContinue}
              disabled={!selected}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
