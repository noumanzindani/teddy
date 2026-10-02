import { View, Text, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Menu, MapPin, Coffee, Star, Clock, Trash2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useState, useEffect } from 'react';
import { Chip, EmptyState, ConfirmPopup } from '@components/primitives';
import { useWaitlist } from '@store/index';
import { api } from '@utils/api';

type Nav = DrawerNavigationProp<any> & { navigate: (s: string, p?: any) => void };
type Tab = 'upcoming' | 'completed' | 'cancelled';
type SubTab = 'all' | 'waitlist';

interface ApiBooking {
  id: string;
  status: string;
  startsAt: string;
  endsAt: string;
  totalAmount: number;
  timerStartedAt?: string | null;
  timerDurationMin?: number | null;
  timerExtraMin?: number;
  balancePaidAt?: string | null;
  balanceAmount?: number;
  service: { id: string; name: string; durationMin: number; price: number; imageUrl: string; category: string };
  vendor: { id: string; businessName: string; address: string; rating: number };
  staffMember?: { user: { firstName: string; lastName: string } } | null;
}

interface BookingRow {
  id: string;
  date: string;
  time: string;
  status: Tab;
  inProgress: boolean;
  awaitingPayment: boolean;
  durationMin: number;
  rating?: number;
  timerStartedAt?: string;
  timerDurationMin?: number;
  timerExtraMin: number;
  service: ApiBooking['service'];
  vendor: ApiBooking['vendor'] & { name: string; location: string };
}

function mapStatus(apiStatus: string): Tab {
  switch (apiStatus) {
    case 'PENDING':
    case 'CONFIRMED':
    case 'WAITLISTED':
    case 'IN_PROGRESS':
      return 'upcoming';
    case 'COMPLETED':
      return 'completed';
    case 'CANCELLED_CLIENT':
    case 'CANCELLED_VENDOR':
    case 'NO_SHOW':
    default:
      return 'cancelled';
  }
}

function mapBooking(b: ApiBooking): BookingRow {
  const d = new Date(b.startsAt);
  return {
    id: b.id,
    date: d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    status: mapStatus(b.status),
    inProgress: b.status === 'IN_PROGRESS',
    awaitingPayment: b.status === 'COMPLETED' && !b.balancePaidAt,
    durationMin: b.service.durationMin,
    timerStartedAt: b.timerStartedAt ?? undefined,
    timerDurationMin: b.timerDurationMin ?? undefined,
    timerExtraMin: b.timerExtraMin ?? 0,
    service: b.service,
    vendor: {
      ...b.vendor,
      name: b.vendor.businessName,
      location: b.vendor.address ?? '',
    },
  };
}

/** Remaining seconds for a running service timer, computed locally from the start time. */
function remainingSeconds(row: BookingRow, nowMs: number): number | null {
  if (!row.timerStartedAt || !row.timerDurationMin) return null;
  const totalMs = (row.timerDurationMin + row.timerExtraMin) * 60 * 1000;
  const endMs = new Date(row.timerStartedAt).getTime() + totalMs;
  return Math.round((endMs - nowMs) / 1000);
}

function fmtCountdown(totalSec: number): string {
  const s = Math.abs(totalSec);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${totalSec < 0 ? '-' : ''}${m}:${sec.toString().padStart(2, '0')}`;
}

/** Live "service in progress" banner shown to the client for full transparency. */
function LiveServiceBanner({ row, nowMs }: { row: BookingRow; nowMs: number }) {
  const rem = remainingSeconds(row, nowMs);
  return (
    <View className="bg-sage-700 rounded-2xl px-4 py-3 mb-3 flex-row items-center">
      <View className="w-9 h-9 rounded-full bg-white/20 items-center justify-center mr-3">
        <Clock size={18} color="#FFF" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-bold text-white">Service in progress</Text>
        <Text className="text-xs text-white/80 mt-0.5">
          {row.service.name} · started with {row.vendor.name}
        </Text>
      </View>
      {rem !== null && (
        <View className="items-end">
          <Text className="text-lg font-black text-white tabular-nums">{fmtCountdown(rem)}</Text>
          <Text className="text-[10px] text-white/70">{rem < 0 ? 'overtime' : 'remaining'}</Text>
        </View>
      )}
    </View>
  );
}

function StatusBadge({ status }: { status: Tab }) {
  if (status === 'completed') {
    return (
      <View className="bg-success rounded-full px-3 py-1">
        <Text className="text-xs font-semibold text-white">Completed</Text>
      </View>
    );
  }
  if (status === 'cancelled') {
    return (
      <View className="bg-danger rounded-full px-3 py-1">
        <Text className="text-xs font-semibold text-white">Cancelled</Text>
      </View>
    );
  }
  return null;
}

function BookingCard({ row, nav, onCancel }: { row: BookingRow; nav: Nav; onCancel: () => void }) {
  const { service, vendor } = row;

  return (
    <View className="bg-surface-raised rounded-2xl overflow-hidden mb-4">
      <View className="relative">
        <Image
          source={{ uri: service.imageUrl }}
          style={{ width: '100%', height: 180 }}
          resizeMode="cover"
        />
        {row.status === 'upcoming' && (
          <View className="absolute top-3 right-3 flex-row gap-2">
            <Pressable
              onPress={onCancel}
              className="bg-danger rounded-full px-3 py-1.5 active:opacity-90"
            >
              <Text className="text-xs font-semibold text-white">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => nav.navigate('RescheduleTimeSlot', { bookingId: row.id })}
              className="bg-white rounded-full px-3 py-1.5 active:opacity-90"
            >
              <Text className="text-xs font-semibold text-ink">Reschedule</Text>
            </Pressable>
          </View>
        )}
        {row.status === 'completed' && (
          <View className="absolute top-3 right-3">
            {row.awaitingPayment ? (
              <Pressable
                onPress={() => nav.navigate('ServiceInvoice', { bookingId: row.id })}
                className="bg-sage-700 rounded-full px-3 py-1.5 active:opacity-90"
              >
                <Text className="text-xs font-semibold text-white">Review &amp; Pay</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => nav.navigate('RateExperience', { bookingId: row.id })}
                className="bg-gold-300 rounded-full px-3 py-1.5 active:opacity-90"
              >
                <Text className="text-xs font-semibold text-ink">Rate Now</Text>
              </Pressable>
            )}
          </View>
        )}
        <View className="absolute bottom-3 left-3 bg-white/95 rounded-full pl-1.5 pr-3 py-1 flex-row items-center">
          <View className="w-7 h-7 rounded-full bg-sage-700 items-center justify-center mr-2">
            <Coffee size={14} color="#FFF" />
          </View>
          <Text className="text-xs font-semibold text-ink">{vendor.name}</Text>
        </View>
      </View>

      <View className="p-4">
        <View className="flex-row items-start justify-between mb-3">
          <Text className="text-base font-bold text-ink flex-1">{service.name}</Text>
          <View className="flex-row items-center gap-2">
            <View className="border border-sage-300 rounded-full px-3 py-1">
              <Text className="text-xs text-ink-soft">Est. Duration {row.durationMin} min</Text>
            </View>
            <StatusBadge status={row.status} />
          </View>
        </View>

        <View className="bg-surface rounded-2xl p-3 flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-sage-700 items-center justify-center mr-3">
            <Coffee size={18} color="#FFF" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-ink">{vendor.name}</Text>
            <View className="flex-row items-center mt-0.5">
              <MapPin size={12} color="#6B6B62" />
              <Text className="text-xs text-ink-muted ml-1">{vendor.location}</Text>
            </View>
          </View>
          <View>
            {row.rating ? (
              <View className="flex-row items-center mb-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={11} color="#F5A623" fill={n <= row.rating! ? '#F5A623' : 'transparent'} />
                ))}
              </View>
            ) : null}
            <Text className="text-sm font-bold text-ink text-right">{row.date}, {row.time}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function MyBookingsScreen() {
  const nav = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('upcoming');
  const [subTab, setSubTab] = useState<SubTab>('all');
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const waitlistEntries = useWaitlist((s) => s.entries);
  const removeWaitlistEntry = useWaitlist((s) => s.removeEntry);

  const load = () =>
    api.get<ApiBooking[]>('/users/me/bookings')
      .then((data) => setRows(data.map(mapBooking)))
      .catch(() => {/* keep existing list on error */})
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const anyInProgress = rows.some((r) => r.inProgress);

  // While a service is running, tick every second for the live countdown and
  // re-poll every 20s so the client sees the moment staff starts/extends/ends it.
  useEffect(() => {
    if (!anyInProgress && tab !== 'upcoming') return;
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    const poll = setInterval(() => { load(); }, 20000);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [anyInProgress, tab]);

  const visible = rows.filter((r) => r.status === tab);

  const confirmCancel = () => {
    setCancelTarget(null);
    (nav as any).navigate('CancelReason', { bookingId: cancelTarget });
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <View className="flex-row items-center">
          <Pressable onPress={() => nav.openDrawer?.()} hitSlop={10} className="mr-3">
            <Menu size={24} color="#1B1B16" />
          </Pressable>
          <Text className="text-2xl font-bold text-ink">My Bookings</Text>
        </View>
        <Pressable onPress={() => nav.navigate('Notifications')} hitSlop={10}>
          <Bell size={22} color="#1B1B16" />
        </Pressable>
      </View>

      <View className="px-5 pt-2 flex-row gap-2">
        {(['upcoming', 'completed', 'cancelled'] as Tab[]).map((t) => {
          const active = t === tab;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              className={`px-4 py-2 rounded-full ${active ? 'bg-sage-700' : 'bg-transparent'}`}
            >
              <Text className={`text-sm font-medium capitalize ${active ? 'text-white' : 'text-ink-muted'}`}>
                {t}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'upcoming' && (
        <View className="px-5 pt-4 flex-row gap-2">
          <Chip label="All" selected={subTab === 'all'} onPress={() => setSubTab('all')} size="sm" />
          <Chip label="Waitlist" selected={subTab === 'waitlist'} onPress={() => setSubTab('waitlist')} size="sm" />
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color="#3D6B5E" />
          </View>
        ) : tab === 'upcoming' && subTab === 'waitlist' ? (
          waitlistEntries.length === 0 ? (
            <EmptyState
              title="No waitlist entries"
              description="When all slots are full, you can join the waitlist from the booking screen."
            />
          ) : (
            waitlistEntries.map((entry, index) => (
              <View key={entry.id} className="bg-surface-raised rounded-2xl p-4 mb-4">
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1">
                    <Text className="text-base font-bold text-ink">{entry.serviceName}</Text>
                    <Text className="text-sm text-ink-muted mt-0.5">{entry.salonName}</Text>
                  </View>
                  <View className="bg-gold-100 rounded-full px-3 py-1 ml-2">
                    <Text className="text-xs font-bold text-gold-800">#{index + 1} in queue</Text>
                  </View>
                </View>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Clock size={13} color="#6B6B62" />
                    <Text className="ml-1.5 text-xs text-ink-muted">
                      Requested: {entry.requestedDate}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => removeWaitlistEntry(entry.id)}
                    hitSlop={8}
                    className="flex-row items-center gap-1.5"
                  >
                    <Trash2 size={14} color="#EF4444" />
                    <Text className="text-xs font-semibold text-danger">Remove</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )
        ) : visible.length === 0 ? (
          <EmptyState
            title={
              tab === 'upcoming'
                ? 'No upcoming bookings'
                : tab === 'completed'
                ? 'No completed bookings yet'
                : 'No cancelled bookings'
            }
            description={tab === 'upcoming' ? 'Book a service to see it here.' : undefined}
          />
        ) : (
          visible.map((row) => (
            <View key={row.id}>
              {row.inProgress && <LiveServiceBanner row={row} nowMs={nowMs} />}
              <BookingCard
                row={row}
                nav={nav}
                onCancel={() => setCancelTarget(row.id)}
              />
            </View>
          ))
        )}
      </ScrollView>

      <ConfirmPopup
        visible={cancelTarget !== null}
        title="Are you sure?"
        body="This action cannot be undone. Your slot will be released."
        confirmLabel="No"
        cancelLabel="Yes"
        onConfirm={() => setCancelTarget(null)}
        onCancel={confirmCancel}
      />
    </SafeAreaView>
  );
}
