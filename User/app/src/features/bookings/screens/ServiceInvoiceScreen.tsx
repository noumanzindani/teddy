import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CheckCircle2, Receipt } from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { GradientButton } from '@components/primitives';
import { api } from '@utils/api';
import type { RootStackParamList } from '@navigation/types';

type R = RouteProp<RootStackParamList, 'ServiceInvoice'>;

interface ApiBooking {
  id: string;
  status: string;
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  tipAmount: number;
  timerExtraCost: number;
  balancePaidAt: string | null;
  service: { name: string };
  vendor: { businessName: string };
  staffMember?: { user: { firstName: string; lastName: string } } | null;
}

const TIP_PCTS = [15, 18, 20, 25];

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <View className="flex-row justify-between items-center py-1.5">
      <Text className={`text-sm ${muted ? 'text-ink-muted' : 'text-ink'} ${bold ? 'font-bold' : ''}`}>{label}</Text>
      <Text className={`text-sm ${muted ? 'text-ink-muted' : 'text-ink'} ${bold ? 'font-bold' : ''} tabular-nums`}>{value}</Text>
    </View>
  );
}

export function ServiceInvoiceScreen() {
  const nav = useNavigation();
  const route = useRoute<R>();
  const { bookingId } = route.params;

  const [booking, setBooking] = useState<ApiBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [tipMode, setTipMode] = useState<number | 'custom' | null>(null);
  const [customTip, setCustomTip] = useState('');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get<ApiBooking>(`/bookings/${bookingId}`)
      .then((b) => setBooking(b))
      .catch(() => setError('Could not load your invoice.'))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const subtotal = Number(booking?.totalAmount ?? 0);
  const deposit = Number(booking?.depositAmount ?? 0);
  const balance = Number(booking?.balanceAmount ?? 0);
  const extra = Number(booking?.timerExtraCost ?? 0);
  const alreadyPaid = !!booking?.balancePaidAt;

  const tip = useMemo(() => {
    if (tipMode === 'custom') return Math.max(0, parseFloat(customTip) || 0);
    if (typeof tipMode === 'number') return Math.round(subtotal * tipMode) / 100;
    return 0;
  }, [tipMode, customTip, subtotal]);

  const dueNow = balance + extra + tip;
  const grandTotal = subtotal + extra + (alreadyPaid ? Number(booking?.tipAmount ?? 0) : tip);

  async function handleConfirm() {
    if (!booking) return;
    setError(null);
    setPaying(true);
    try {
      await api.post(`/bookings/${booking.id}/pay-balance`, { tip });
      setDone(true);
    } catch (e: any) {
      setError(e?.message ?? 'Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator size="large" color="#3D6B5E" />
      </SafeAreaView>
    );
  }

  // Success / already-paid receipt view
  if (done || alreadyPaid) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          <View className="items-center mt-6 mb-6">
            <View className="w-16 h-16 rounded-full bg-success/15 items-center justify-center mb-3">
              <CheckCircle2 size={34} color="#3D9A6B" />
            </View>
            <Text className="text-2xl font-bold text-ink">Payment complete</Text>
            <Text className="text-sm text-ink-muted mt-1 text-center">
              Your invoice has been shared with you, the salon and your specialist.
            </Text>
          </View>

          <View className="bg-surface-raised rounded-2xl p-5">
            <View className="flex-row items-center mb-3">
              <Receipt size={18} color="#1B1B16" />
              <Text className="text-base font-bold text-ink ml-2">Invoice</Text>
            </View>
            <Text className="text-sm font-semibold text-ink">{booking?.service.name}</Text>
            <Text className="text-xs text-ink-muted mb-3">{booking?.vendor.businessName}</Text>
            <View className="h-px bg-sage-200 my-1" />
            <Row label="Service" value={`$${subtotal.toFixed(2)}`} />
            {extra > 0 && <Row label="Extra time" value={`$${extra.toFixed(2)}`} />}
            <Row label="Deposit paid" value={`-$${deposit.toFixed(2)}`} muted />
            <Row label="Tip" value={`$${Number(booking?.tipAmount ?? tip).toFixed(2)}`} />
            <View className="h-px bg-sage-200 my-1" />
            <Row label="Total" value={`$${grandTotal.toFixed(2)}`} bold />
          </View>
        </ScrollView>
        <View className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-surface">
          <GradientButton label="Done" onPress={() => (nav as any).navigate('MyBookings')} />
        </View>
      </SafeAreaView>
    );
  }

  // Review & pay view
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View className="px-5 pt-4 pb-3">
          <Pressable onPress={() => nav.goBack()} hitSlop={10} className="mb-3">
            <ChevronLeft size={26} color="#1B1B16" />
          </Pressable>
          <Text className="text-3xl font-bold text-ink">Review & Pay</Text>
          <Text className="text-sm text-ink-muted mt-1">
            {booking?.service.name} · {booking?.vendor.businessName}
          </Text>
        </View>

        {/* Invoice breakdown */}
        <View className="px-5">
          <View className="bg-surface-raised rounded-2xl p-5">
            <Row label="Service" value={`$${subtotal.toFixed(2)}`} />
            {extra > 0 && <Row label="Extra time added" value={`$${extra.toFixed(2)}`} />}
            <Row label="Deposit already paid" value={`-$${deposit.toFixed(2)}`} muted />
            <View className="h-px bg-sage-200 my-2" />
            <Row label="Balance due" value={`$${(balance + extra).toFixed(2)}`} bold />
          </View>
        </View>

        {/* Tip */}
        <View className="px-5 mt-4">
          <Text className="text-base font-bold text-ink mb-2">Add a tip for {booking?.staffMember ? booking.staffMember.user.firstName : 'your specialist'}</Text>
          <View className="flex-row flex-wrap gap-2">
            {TIP_PCTS.map((p) => {
              const sel = tipMode === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => setTipMode(p)}
                  className={`px-4 py-2.5 rounded-full border ${sel ? 'bg-sage-700 border-sage-700' : 'bg-surface-raised border-sage-300'}`}
                >
                  <Text className={`text-sm font-semibold ${sel ? 'text-white' : 'text-ink'}`}>
                    {p}% · ${(Math.round(subtotal * p) / 100).toFixed(2)}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setTipMode('custom')}
              className={`px-4 py-2.5 rounded-full border ${tipMode === 'custom' ? 'bg-sage-700 border-sage-700' : 'bg-surface-raised border-sage-300'}`}
            >
              <Text className={`text-sm font-semibold ${tipMode === 'custom' ? 'text-white' : 'text-ink'}`}>Custom</Text>
            </Pressable>
            <Pressable
              onPress={() => setTipMode(null)}
              className={`px-4 py-2.5 rounded-full border ${tipMode === null ? 'bg-sage-700 border-sage-700' : 'bg-surface-raised border-sage-300'}`}
            >
              <Text className={`text-sm font-semibold ${tipMode === null ? 'text-white' : 'text-ink'}`}>No tip</Text>
            </Pressable>
          </View>

          {tipMode === 'custom' && (
            <View className="bg-surface-input rounded-full px-4 py-3 mt-3 flex-row items-center">
              <Text className="text-base text-ink mr-1">$</Text>
              <TextInput
                placeholder="0.00"
                placeholderTextColor="#6B6B62"
                keyboardType="decimal-pad"
                value={customTip}
                onChangeText={setCustomTip}
                className="flex-1 text-base text-ink"
              />
            </View>
          )}
        </View>

        {/* Total */}
        <View className="px-5 mt-4">
          <View className="bg-surface-raised rounded-2xl px-5 py-4">
            <Row label="Balance" value={`$${(balance + extra).toFixed(2)}`} />
            <Row label="Tip" value={`$${tip.toFixed(2)}`} />
            <View className="h-px bg-sage-200 my-2" />
            <Row label="You pay now" value={`$${dueNow.toFixed(2)}`} bold />
          </View>
        </View>

        {error ? (
          <View className="px-5 mt-3"><Text className="text-sm text-danger">{error}</Text></View>
        ) : null}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-surface">
        <GradientButton
          label={paying ? 'Processing…' : `Confirm & Pay $${dueNow.toFixed(2)}`}
          onPress={handleConfirm}
        />
      </View>
    </SafeAreaView>
  );
}
