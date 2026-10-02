import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Calendar, Clock, MapPin, Tag, CheckCircle } from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { GradientButton } from '@components/primitives';
import { services, salons } from '@mock/index';
import type { RootStackParamList } from '@navigation/types';

type R = RouteProp<RootStackParamList, 'BookingSummary'>;

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View className="flex-row items-center py-3 border-b border-sage-200 last:border-b-0">
      <View className="w-8 items-center">{icon}</View>
      <Text className="text-sm text-ink-muted ml-2 w-24">{label}</Text>
      <Text className="text-sm font-semibold text-ink flex-1 text-right">{value}</Text>
    </View>
  );
}

export function BookingSummaryScreen() {
  const nav = useNavigation();
  const route = useRoute<R>();
  const { serviceId, date, time } = route.params;

  const service = services.find((s) => s.id === serviceId) ?? services[0];
  const salon = salons.find((s) => s.id === service.salonId);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center px-5 pt-4 pb-3">
        <Pressable onPress={() => nav.goBack()} hitSlop={10} className="mr-3">
          <ChevronLeft size={26} color="#1B1B16" />
        </Pressable>
        <Text className="text-xl font-bold text-ink">Booking Summary</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}>
        {/* Confirmation icon */}
        <View className="items-center py-6">
          <View className="w-16 h-16 rounded-full bg-gold-100 items-center justify-center mb-3">
            <CheckCircle size={36} color="#C9AD3A" />
          </View>
          <Text className="text-lg font-bold text-ink">Review Your Booking</Text>
          <Text className="text-sm text-ink-muted mt-1 text-center px-8">
            Please confirm the details below before proceeding to payment.
          </Text>
        </View>

        {/* Detail card */}
        <View className="bg-surface-raised rounded-2xl px-4 py-2 mb-4">
          <Row icon={<Tag size={16} color="#6B6B62" />}     label="Service"  value={service.name} />
          <Row icon={<MapPin size={16} color="#6B6B62" />}  label="Salon"    value={salon?.name ?? '—'} />
          <Row icon={<Calendar size={16} color="#6B6B62" />} label="Date"    value={date} />
          <Row icon={<Clock size={16} color="#6B6B62" />}   label="Time"     value={time} />
          <Row icon={<Clock size={16} color="#6B6B62" />}   label="Duration" value={`${service.durationMin} min`} />
        </View>

        {/* Price breakdown */}
        <View className="bg-surface-raised rounded-2xl px-4 py-3 mb-4">
          <View className="flex-row justify-between py-2 border-b border-sage-200">
            <Text className="text-sm text-ink-muted">Service price</Text>
            <Text className="text-sm font-semibold text-ink">${service.price}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-sage-200">
            <Text className="text-sm text-ink-muted">Taxes & fees</Text>
            <Text className="text-sm text-ink-muted">Calculated at checkout</Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-base font-bold text-ink">Subtotal</Text>
            <Text className="text-base font-bold text-ink">${service.price}</Text>
          </View>
        </View>

        {/* Cancellation notice */}
        <View className="bg-gold-50 rounded-2xl px-4 py-3">
          <Text className="text-xs text-gold-800 font-medium">
            ⓘ  Free cancellation up to 24 hours before your appointment. Cancellations within 24 hours may incur a fee.
          </Text>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-surface border-t border-sage-200">
        <GradientButton
          label="Continue to Payment"
          onPress={() =>
            (nav as any).navigate('BookingPayment', {
              serviceId,
              date,
              time,
              vendorId: service.salonId,
              intake: (route.params as any).intake,
              addOns: (route.params as any).addOns,
            })
          }
        />
      </View>
    </SafeAreaView>
  );
}
