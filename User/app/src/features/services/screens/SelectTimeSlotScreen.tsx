import { useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { TimeSlotPicker } from '../components/TimeSlotPicker';
import type { RootStackParamList } from '@navigation/types';
import { useWaitlist } from '@store/index';
import { services, salons } from '@mock/index';
import { SuccessPopup } from '@components/primitives';

type R = RouteProp<RootStackParamList, 'SelectTimeSlot'>;

export function SelectTimeSlotScreen() {
  const nav = useNavigation();
  const route = useRoute<R>();
  const addEntry = useWaitlist((s) => s.addEntry);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);

  const { serviceId, vendorId } = route.params;

  // TODO: fetch real service name/price from GET /services/:vendorId once vendorId
  //       is guaranteed to be present. For now fall back to the mock list for display only.
  const service = services.find((s) => s.id === serviceId) ?? services[0];
  const salon = salons.find((s) => s.id === service.salonId);

  function handleJoinWaitlist(date: string) {
    addEntry({
      serviceId: service.id,
      serviceName: service.name,
      salonId: service.salonId,
      salonName: salon?.name ?? 'Unknown Salon',
      requestedDate: date,
    });
    setWaitlistSuccess(true);
  }

  return (
    <>
      <TimeSlotPicker
        title="Select Time Slot"
        serviceId={serviceId}
        ctaLabel="Continue"
        onContinue={(date, time) =>
          (nav as any).navigate('StaffSelection', {
            serviceId,
            date,
            time,
            // Pass vendorId downstream so StaffSelection and SalonIntake can use it
            // for booking creation in BookingPaymentScreen.
            vendorId,
          })
        }
        onJoinWaitlist={handleJoinWaitlist}
      />
      <SuccessPopup
        visible={waitlistSuccess}
        title="Added to Waitlist"
        body={`We'll notify you when a slot opens at ${salon?.name ?? 'the salon'}. Check My Bookings → Waitlist for your position.`}
        ctaLabel="View My Bookings"
        onPress={() => {
          setWaitlistSuccess(false);
          (nav as any).navigate('MyBookings');
        }}
      />
    </>
  );
}
