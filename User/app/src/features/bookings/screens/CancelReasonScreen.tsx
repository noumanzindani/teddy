import { View, Text, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation, useRoute, CommonActions, type RouteProp } from '@react-navigation/native';
import { useState } from 'react';
import { GradientButton, TextArea } from '@components/primitives';
import { api } from '@utils/api';
import type { RootStackParamList } from '@navigation/types';

type R = RouteProp<RootStackParamList, 'CancelReason'>;

const REASONS = [
  'Change of plans',
  'Found a better time',
  'Service not needed',
  'Booking mistake',
  'Other',
];

function RadioRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center py-2">
      <View
        className={`w-5 h-5 rounded-full items-center justify-center ${
          selected ? 'bg-sage-700 border-2 border-sage-700' : 'border-2 border-sage-400'
        }`}
      >
        {selected && <Text className="text-white text-[9px] leading-3">✓</Text>}
      </View>
      <Text className="ml-3 text-base text-ink">{label}</Text>
    </Pressable>
  );
}

export function CancelReasonScreen() {
  const nav = useNavigation();
  const route = useRoute<R>();
  const bookingId = route.params?.bookingId;
  const [reason, setReason] = useState<string>('Other');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!bookingId) {
      nav.goBack();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fullReason = note.trim() ? `${reason}: ${note.trim()}` : reason;
      await api.post(`/bookings/${bookingId}/cancel`, { reason: fullReason });
      nav.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'MainDrawer' }] })
      );
    } catch (e: any) {
      setError(e?.message ?? 'Failed to cancel booking. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-row items-center justify-between px-6 pt-4">
          <Pressable onPress={() => nav.goBack()} hitSlop={10}>
            <ChevronLeft size={28} color="#1B1B16" />
          </Pressable>
          <Pressable onPress={() => nav.goBack()} hitSlop={10}>
            <Text className="text-base font-medium text-ink">Skip</Text>
          </Pressable>
        </View>

        <View className="flex-1 px-6 pt-6">
          <Text className="text-3xl font-bold text-ink mb-6">Tell Us Why You're Cancelling</Text>

          <View className="mb-6">
            {REASONS.map((r) => (
              <RadioRow key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />
            ))}
          </View>

          <TextArea placeholder="Write your reason..." value={note} onChangeText={setNote} />

          {error ? (
            <Text className="text-sm text-danger mt-3">{error}</Text>
          ) : null}
        </View>

        <View className="px-6 pb-6">
          <GradientButton
            label={loading ? 'Cancelling…' : 'Submit & Cancel'}
            onPress={handleSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
