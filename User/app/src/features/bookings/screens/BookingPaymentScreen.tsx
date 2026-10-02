import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useState } from 'react';
import { GradientButton, Badge } from '@components/primitives';
import { useUser } from '@store/index';
import { services } from '@mock/index';
import { api } from '@utils/api';
import type { RootStackParamList } from '@navigation/types';

type R = RouteProp<RootStackParamList, 'BookingPayment'>;
type Method = 'points' | 'card' | 'apple' | 'google';

const POINTS_PER_DOLLAR = 100; // 100 points = $1

function toISO(date: string, time: string): string {
  const [hm, period] = time.split(' ');
  const [h, m] = hm.split(':').map(Number);
  const hour24 =
    period === 'PM' && h !== 12 ? h + 12 : period === 'AM' && h === 12 ? 0 : h;
  return `${date}T${String(hour24).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`;
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <View className={`w-5 h-5 rounded-full border-2 ${selected ? 'border-gold-700' : 'border-sage-400'} items-center justify-center`}>
      {selected && <View className="w-2.5 h-2.5 rounded-full bg-gold-700" />}
    </View>
  );
}

export function BookingPaymentScreen() {
  const nav = useNavigation();
  const route = useRoute<R>();
  const { serviceId, date, time, vendorId, intake, addOns } = route.params;
  const points = useUser((s) => s.points);
  const [method, setMethod] = useState<Method>('card');
  const [promo, setPromo] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const service = services.find((s) => s.id === serviceId);
  const servicePrice = service?.price ?? 0;

  const pointsValueDollars = Math.floor(points / POINTS_PER_DOLLAR);
  const pointsDiscount = Math.min(pointsValueDollars, servicePrice);
  const totalAfterPoints = servicePrice - pointsDiscount;
  const hasEnoughPoints = points >= POINTS_PER_DOLLAR;

  async function handlePay() {
    setPayError(null);

    // Full real flow when we have all booking params
    if (vendorId && date && time) {
      setPaying(true);
      try {
        const startsAt = toISO(date, time);

        // 1. Create booking
        const booking = await api.post<{ id: string; status: string }>(
          '/bookings',
          { serviceId, vendorId, startsAt, ...(addOns?.length ? { addOns } : {}) }
        );

        // 1b. Submit the pre-visit questionnaire — saves it, merges declared
        // allergies into the profile (feeding the staff safety check), and emails
        // the form to the client, salon and staff. Non-blocking on failure.
        if (intake) {
          try { await api.post(`/clinical/bookings/${booking.id}/intake`, intake); } catch { /* keep booking flow */ }
        }

        // 2. Create payment intent
        await api.post<{ clientSecret: string; amount: number; currency: string }>(
          '/payments/intent',
          { bookingId: booking.id }
        );

        // 3. Confirm payment
        await api.post<{ booking: { id: string; status: string } }>(
          '/payments/confirm',
          { bookingId: booking.id }
        );

        (nav as any).navigate('BookingConfirmed');
      } catch (e: any) {
        setPayError(e?.message ?? 'Payment failed. Please try again.');
      } finally {
        setPaying(false);
      }
      return;
    }

    // Graceful fallback — mock flow when params are incomplete
    (nav as any).navigate('BookingConfirmed');
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-5 pt-4 pb-3">
          <Pressable onPress={() => nav.goBack()} hitSlop={10} className="mb-3">
            <ChevronLeft size={26} color="#1B1B16" />
          </Pressable>
          <Text className="text-3xl font-bold text-ink">Payment Options</Text>
        </View>

        {/* Order total */}
        {servicePrice > 0 && (
          <View className="px-5 mb-2">
            <View className="bg-surface-raised rounded-2xl px-4 py-3 flex-row justify-between items-center">
              <Text className="text-sm text-ink-muted">Order total</Text>
              <View className="flex-row items-baseline gap-2">
                {method === 'points' && pointsDiscount > 0 && (
                  <Text className="text-sm text-ink-muted line-through">${servicePrice}</Text>
                )}
                <Text className="text-base font-bold text-ink">
                  ${method === 'points' ? totalAfterPoints : servicePrice}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Promo code */}
        <View className="px-5 mt-2">
          <View className="bg-surface-raised rounded-2xl px-4 py-3.5 flex-row items-center justify-between">
            <TextInput
              placeholder="Have a promo code or gift card?"
              placeholderTextColor="#6B6B62"
              value={promo}
              onChangeText={setPromo}
              className="flex-1 text-base text-ink"
            />
            <Pressable hitSlop={6}>
              <Text className="text-base font-bold text-ink">Apply</Text>
            </Pressable>
          </View>
        </View>

        {/* Payment methods */}
        <View className="px-5 mt-4">
          <View className="bg-surface-raised rounded-2xl p-4 gap-4">
            {/* Teddy Points */}
            <Pressable
              onPress={() => hasEnoughPoints && setMethod('points')}
              className={`flex-row items-start ${!hasEnoughPoints ? 'opacity-40' : ''}`}
            >
              <Radio selected={method === 'points'} />
              <View className="ml-3 flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-base text-ink">Teddy Points</Text>
                  <Badge label="Recommended" tone="sage" />
                </View>
                <Text className="text-xs text-ink-muted mt-0.5">
                  {points.toLocaleString()} pts available
                  {hasEnoughPoints
                    ? ` · saves $${pointsDiscount} on this booking`
                    : ' · minimum 100 pts required'}
                </Text>
              </View>
            </Pressable>

            {method === 'points' && hasEnoughPoints && (
              <View className="ml-8 bg-gold-50 rounded-xl px-3 py-2">
                <Text className="text-xs text-gold-800 font-medium">
                  {(pointsDiscount * POINTS_PER_DOLLAR).toLocaleString()} pts will be deducted · ${pointsDiscount} discount applied
                </Text>
              </View>
            )}

            {/* Card */}
            <Pressable onPress={() => setMethod('card')} className="flex-row items-center">
              <Radio selected={method === 'card'} />
              <Text className="ml-3 text-base text-ink">Credit / Debit Card</Text>
            </Pressable>

            {method === 'card' && (
              <View className="gap-3 pl-8">
                <View className="bg-surface-input rounded-full px-4 py-3">
                  <TextInput placeholder="Card Holder name" placeholderTextColor="#6B6B62" className="text-base text-ink" />
                </View>
                <View className="bg-surface-input rounded-full px-4 py-3">
                  <TextInput placeholder="Card Number" placeholderTextColor="#6B6B62" keyboardType="number-pad" className="text-base text-ink" />
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1 bg-surface-input rounded-full px-4 py-3">
                    <TextInput placeholder="Expiration Date" placeholderTextColor="#6B6B62" className="text-base text-ink" />
                  </View>
                  <View className="flex-1 bg-surface-input rounded-full px-4 py-3">
                    <TextInput placeholder="CVV" placeholderTextColor="#6B6B62" keyboardType="number-pad" secureTextEntry className="text-base text-ink" />
                  </View>
                </View>
              </View>
            )}

            {/* Apple Pay */}
            <Pressable onPress={() => setMethod('apple')} className="flex-row items-center">
              <Radio selected={method === 'apple'} />
              <Text className="ml-3 text-base text-ink">Apple Pay</Text>
            </Pressable>

            {/* Google Pay */}
            <Pressable onPress={() => setMethod('google')} className="flex-row items-center">
              <Radio selected={method === 'google'} />
              <Text className="ml-3 text-base text-ink">Google Pay</Text>
            </Pressable>
          </View>
        </View>

        {payError ? (
          <View className="px-5 mt-3">
            <Text className="text-sm text-danger">{payError}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-surface">
        <GradientButton label={paying ? 'Processing…' : 'Pay Now'} onPress={handlePay} />
      </View>
    </SafeAreaView>
  );
}
