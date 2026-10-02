import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Clock, Calendar } from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useState, useEffect } from 'react';
import { GradientButton, PillInput, TextArea, ConfirmPopup } from '@components/primitives';
import { services, salons } from '@mock/index';
import type { RootStackParamList } from '@navigation/types';
import { api } from '@utils/api';

type R = RouteProp<RootStackParamList, 'SalonIntake'>;
interface AddOn { id: string; name: string; price: number; durationMin: number; }

export function SalonIntakeScreen() {
  const nav = useNavigation();
  const route = useRoute<R>();
  const service = services.find((s) => s.id === route.params.serviceId) ?? services[0];
  const salon = salons.find((s) => s.id === service.salonId);

  const [skinType, setSkinType] = useState('Combination');
  const [allergens, setAllergens] = useState('Fragrance, Parabens');
  const [productsUsing, setProductsUsing] = useState('Vitamin C serum, retinol');
  const [goals, setGoals] = useState('Hydration, even tone');
  const [notes, setNotes] = useState('');
  const [skipConfirm, setSkipConfirm] = useState(false);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.get<AddOn[]>(`/addons?serviceId=${route.params.serviceId}&activeOnly=true`).then(setAddOns).catch(() => {});
  }, [route.params.serviceId]);

  const toList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
  const chosenAddOns = addOns.filter((a) => selected[a.id]).map((a) => ({ id: a.id, name: a.name, price: Number(a.price), durationMin: a.durationMin }));
  const proceedToPayment = () =>
    (nav as any).navigate('BookingSummary', {
      serviceId: route.params.serviceId,
      date: route.params.date,
      time: route.params.time,
      addOns: chosenAddOns,
      intake: {
        skinType,
        allergens: skipConfirm ? [] : toList(allergens),
        products: toList(productsUsing),
        goals,
        notes,
      },
    });

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center px-5 pt-4 pb-3">
        <Pressable onPress={() => nav.goBack()} hitSlop={10} className="mr-3">
          <ChevronLeft size={26} color="#1B1B16" />
        </Pressable>
        <Text className="text-xl font-bold text-ink">Pre-Visit Questionnaire</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
        <View className="bg-surface-raised rounded-2xl p-4 mb-5">
          <Text className="text-base font-bold text-ink">{service.name}</Text>
          <Text className="text-sm text-ink-muted mt-0.5">{salon?.name}</Text>
          <View className="flex-row gap-3 mt-3">
            <View className="flex-row items-center">
              <Calendar size={14} color="#6B6B62" />
              <Text className="ml-1.5 text-xs text-ink-soft">{route.params.date}</Text>
            </View>
            <View className="flex-row items-center">
              <Clock size={14} color="#6B6B62" />
              <Text className="ml-1.5 text-xs text-ink-soft">{route.params.time}</Text>
            </View>
          </View>
        </View>

        <View className="bg-gold-100 rounded-2xl px-4 py-2.5 mb-5">
          <Text className="text-xs text-gold-800 font-medium">
            ✨ We've pre-filled answers from your profile — review and adjust as needed.
          </Text>
        </View>

        <View className="gap-4">
          <View>
            <Text className="text-sm font-semibold text-ink mb-2">Skin type</Text>
            <PillInput value={skinType} onChangeText={setSkinType} />
          </View>
          <View>
            <Text className="text-sm font-semibold text-ink mb-2">Known allergens</Text>
            <PillInput value={allergens} onChangeText={setAllergens} />
          </View>
          <View>
            <Text className="text-sm font-semibold text-ink mb-2">Current products you're using</Text>
            <PillInput value={productsUsing} onChangeText={setProductsUsing} />
          </View>
          <View>
            <Text className="text-sm font-semibold text-ink mb-2">What are you hoping to achieve?</Text>
            <PillInput value={goals} onChangeText={setGoals} />
          </View>
          <View>
            <Text className="text-sm font-semibold text-ink mb-2">Anything else we should know?</Text>
            <TextArea value={notes} onChangeText={setNotes} placeholder="Optional" />
          </View>
        </View>

        {addOns.length > 0 && (
          <View className="bg-surface-raised rounded-2xl p-4 mt-1">
            <Text className="text-base font-bold text-ink mb-1">Enhance your service</Text>
            <Text className="text-xs text-ink-muted mb-3">Optional add-ons — each adds to your time and total.</Text>
            {addOns.map((a) => {
              const on = !!selected[a.id];
              return (
                <Pressable key={a.id} onPress={() => setSelected((s) => ({ ...s, [a.id]: !s[a.id] }))}
                  className={`flex-row items-center justify-between rounded-xl px-4 py-3 mb-2 border ${on ? 'border-gold bg-gold/10' : 'border-sage-200 bg-surface'}`}>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-ink">{a.name}</Text>
                    <Text className="text-xs text-ink-muted">+${Number(a.price).toFixed(2)} · +{a.durationMin} min</Text>
                  </View>
                  <View className={`w-6 h-6 rounded-full items-center justify-center border ${on ? 'bg-gold border-gold' : 'border-sage-300'}`}>
                    {on && <Text className="text-ink text-xs font-bold">✓</Text>}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-surface flex-row gap-3">
        <Pressable
          onPress={() => setSkipConfirm(true)}
          className="bg-sage-200 rounded-full px-5 py-3.5 items-center justify-center active:opacity-80"
        >
          <Text className="text-base font-semibold text-ink">Skip</Text>
        </Pressable>
        <View className="flex-1">
          <GradientButton label="Submit & Continue" onPress={proceedToPayment} />
        </View>
      </View>

      <ConfirmPopup
        visible={skipConfirm}
        title="Are You Sure?"
        body="Are you sure? The salon recommends answering for best results."
        confirmLabel="Cancel"
        cancelLabel="Skip"
        onConfirm={() => setSkipConfirm(false)}
        onCancel={() => {
          setSkipConfirm(false);
          proceedToPayment();
        }}
      />
    </SafeAreaView>
  );
}
