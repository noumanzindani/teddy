import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { GradientButton, TextArea } from '@components/primitives';
import { useReviews } from '@store/index';
import { api } from '@utils/api';
import type { RootStackParamList } from '@navigation/types';

type R = RouteProp<RootStackParamList, 'RateExperience'>;

// Word-based feedback scale, mapped onto the 1–5 rating the API stores.
const RATINGS = [
  { key: 'bad',       label: 'Bad',       emoji: '😞', value: 1 },
  { key: 'average',   label: 'Average',   emoji: '😐', value: 3 },
  { key: 'good',      label: 'Good',      emoji: '🙂', value: 4 },
  { key: 'excellent', label: 'Excellent', emoji: '🤩', value: 5 },
] as const;

type RatingKey = (typeof RATINGS)[number]['key'];

interface BookingHeader {
  service: { name: string };
  vendor: { businessName: string; address?: string | null };
  staffMember?: { user: { firstName: string; lastName: string } } | null;
  startsAt: string;
  completedAt?: string | null;
}

export function RateExperienceScreen() {
  const nav = useNavigation();
  const route = useRoute<R>();
  const { submitReview } = useReviews();
  const [selected, setSelected] = useState<RatingKey | null>(null);
  const [review, setReview] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingHeader | null>(null);

  useEffect(() => {
    api.get<BookingHeader>(`/bookings/${route.params.bookingId}`)
      .then(setBooking)
      .catch(() => {/* header is best-effort */});
  }, [route.params.bookingId]);

  const chosen = RATINGS.find((r) => r.key === selected) ?? null;

  const when = booking ? new Date(booking.completedAt ?? booking.startsAt) : null;
  const initials = booking?.vendor.businessName
    ? booking.vendor.businessName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : '';

  async function handleSubmit() {
    if (!chosen) return;
    // Optimistic local record for immediate feedback.
    submitReview({ bookingId: route.params.bookingId, rating: chosen.value, text: review });
    setSubmitted(true);

    try {
      await api.post('/reviews', {
        bookingId: route.params.bookingId,
        rating: chosen.value,
        body: review || undefined,
      });
    } catch (e: any) {
      setApiError(e?.message ?? 'Failed to sync review — saved locally.');
    }

    setTimeout(() => nav.goBack(), 1200);
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center px-5 pt-4 pb-3">
        <Pressable onPress={() => nav.goBack()} hitSlop={10} className="mr-3">
          <ChevronLeft size={26} color="#1B1B16" />
        </Pressable>
        <Text className="text-xl font-bold text-ink flex-1 text-center">Rate Your Experience</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
        {/* Booking header */}
        {booking && (
          <View className="bg-surface-raised rounded-2xl p-4 flex-row items-center">
            <View className="w-11 h-11 rounded-full bg-sage-700 items-center justify-center mr-3">
              <Text className="text-white text-sm font-bold">{initials}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-ink">{booking.service.name}</Text>
              <Text className="text-xs text-ink-muted mt-0.5">
                {booking.vendor.businessName}
                {booking.staffMember ? ` · with ${booking.staffMember.user.firstName}` : ''}
              </Text>
            </View>
            {when && (
              <Text className="text-xs text-ink-muted">
                {when.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
              </Text>
            )}
          </View>
        )}

        {/* Word-scale rating */}
        <View className="bg-surface-raised rounded-2xl p-4 mt-5">
          <Text className="text-base font-bold text-ink mb-4 text-center">How was your service?</Text>
          <View className="flex-row justify-between">
            {RATINGS.map((r) => {
              const active = selected === r.key;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => setSelected(r.key)}
                  className={`items-center rounded-2xl px-2 py-3 ${active ? 'bg-sage-700' : 'bg-surface'}`}
                  style={{ width: '23%' }}
                >
                  <Text style={{ fontSize: 30 }}>{r.emoji}</Text>
                  <Text className={`text-xs font-semibold mt-1.5 ${active ? 'text-white' : 'text-ink-muted'}`}>
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Comment */}
        <Text className="text-sm font-bold text-ink mt-5 mb-2">Tell us more (optional)</Text>
        <TextArea
          placeholder="Share your thoughts with us …"
          value={review}
          onChangeText={setReview}
        />

        {apiError ? (
          <Text className="text-xs text-danger mt-2">{apiError}</Text>
        ) : null}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-surface">
        {submitted ? (
          <View className="bg-green-100 rounded-2xl py-4 items-center">
            <Text className="text-base font-bold text-green-700">Thank you for your feedback!</Text>
          </View>
        ) : (
          <GradientButton
            label={chosen ? `Submit — ${chosen.label}` : 'Select a rating'}
            onPress={handleSubmit}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
