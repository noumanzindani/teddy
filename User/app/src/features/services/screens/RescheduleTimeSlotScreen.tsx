import { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { TimeSlotPicker } from '../components/TimeSlotPicker';
import { services } from '@mock/index';
import { api } from '@utils/api';
import type { RootStackParamList } from '@navigation/types';

type R = RouteProp<RootStackParamList, 'RescheduleTimeSlot'>;

// Build the ISO timestamp the same way the booking flow does (see BookingPaymentScreen).
function toISO(date: string, time: string): string {
  const [hm, period] = time.split(' ');
  const [h, m] = hm.split(':').map(Number);
  const hour24 =
    period === 'PM' && h !== 12 ? h + 12 : period === 'AM' && h === 12 ? 0 : h;
  return `${date}T${String(hour24).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`;
}

export function RescheduleTimeSlotScreen() {
  const nav = useNavigation();
  const route = useRoute<R>();
  const { bookingId } = route.params ?? {};
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReschedule(date: string, time: string) {
    // Without a bookingId there's nothing to reschedule — keep the demo flow working.
    if (!bookingId) {
      (nav as any).navigate('RescheduleSuccess');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const startsAt = toISO(date, time);
      await api.post(`/bookings/${bookingId}/reschedule`, { startsAt });
      (nav as any).navigate('RescheduleSuccess');
    } catch (e: any) {
      const msg = e?.message ?? 'Could not reschedule. Please try again.';
      setError(msg);
      Alert.alert('Reschedule failed', msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <TimeSlotPicker
      title="Reschedule Time Slot"
      serviceId={services[0].id}
      ctaLabel={submitting ? 'Rescheduling…' : 'Confirm New Time'}
      onContinue={handleReschedule}
      loading={submitting}
      error={error}
    />
  );
}
