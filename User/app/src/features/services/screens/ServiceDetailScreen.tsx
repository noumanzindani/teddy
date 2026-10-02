import { View, Text, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Star, Coffee } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { GradientButton } from '@components/primitives';
import { api } from '@utils/api';
import type { ApiService, ApiVendor } from '@utils/api';
import type { RootStackParamList } from '@navigation/types';

type R = RouteProp<RootStackParamList, 'ServiceDetail'>;

const COVER_PLACEHOLDER = 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800';

const BULLETS = [
  'Deep cleansing and gentle exfoliation for smoother skin.',
  'Unclogs pores and removes dead skin cells for a brighter complexion.',
  'Prepares skin for enhanced absorption of serums and moisturizers.',
];

export function ServiceDetailScreen() {
  const nav = useNavigation();
  const route = useRoute<R>();
  const { serviceId, vendorId } = route.params ?? {};

  const [service, setService] = useState<ApiService | null>(null);
  const [vendor, setVendor] = useState<ApiVendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!vendorId) {
      // TODO: fetch from GET /services/:vendorId once a direct serviceId endpoint exists.
      // Without vendorId we cannot look up the service from the API.
      setLoading(false);
      setError('No vendor context — cannot load service details.');
      return;
    }

    setLoading(true);
    setError(null);

    // Fetch the vendor's full service list, then find this specific service.
    // TODO: replace with GET /services/:serviceId when a per-service endpoint is available.
    Promise.all([
      api.get<ApiService[]>('/services/' + vendorId),
      api.get<ApiVendor>('/vendors/' + vendorId),
    ])
      .then(([services, vendorData]) => {
        if (cancelled) return;
        const found = Array.isArray(services)
          ? services.find((s) => s.id === serviceId) ?? null
          : null;
        setService(found);
        setVendor(vendorData);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [serviceId, vendorId]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color="#4A5E3A" />
        <Text className="text-sm text-ink-muted mt-3">Loading service…</Text>
      </SafeAreaView>
    );
  }

  if (error || !service) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center" edges={['top']}>
        <Pressable onPress={() => nav.goBack()} hitSlop={10} className="absolute top-12 left-5">
          <ChevronLeft size={26} color="#1B1B16" />
        </Pressable>
        <Text className="text-base font-semibold text-ink mb-2">Could not load service</Text>
        <Text className="text-sm text-ink-muted text-center px-8">
          {error ?? 'Service not found.'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View className="px-5 pt-2">
          <Pressable onPress={() => nav.goBack()} hitSlop={10} className="mb-4">
            <ChevronLeft size={26} color="#1B1B16" />
          </Pressable>

          <View className="bg-surface-raised rounded-2xl overflow-hidden">
            <View className="relative">
              <Image
                source={{ uri: service.imageUrl ?? COVER_PLACEHOLDER }}
                style={{ width: '100%', height: 220 }}
                resizeMode="cover"
              />
              <View className="absolute top-3 right-3 bg-white/95 rounded-full px-3 py-1">
                <Text className="text-xs text-ink font-medium">
                  Est. Duration {service.durationMin} min
                </Text>
              </View>
              {vendor && (
                <View className="absolute bottom-3 left-3 bg-white/95 rounded-full pl-1.5 pr-3 py-1 flex-row items-center">
                  <View className="w-7 h-7 rounded-full bg-sage-700 items-center justify-center mr-2">
                    <Coffee size={14} color="#FFF" />
                  </View>
                  <Text className="text-xs font-semibold text-ink">{vendor.businessName}</Text>
                </View>
              )}
            </View>

            <View className="p-4">
              <View className="flex-row items-start justify-between mb-2">
                <Text className="text-xl font-bold text-ink flex-1">{service.name}</Text>
                <View className="flex-row items-center ml-2">
                  <Star size={14} color="#F5A623" fill="#F5A623" />
                  <Text className="ml-1 text-sm font-semibold text-ink">
                    {(vendor?.rating ?? 4.5).toFixed(1)}
                  </Text>
                </View>
              </View>
              <Text className="text-sm text-ink-soft leading-5 mb-4">
                {service.description ?? 'A revitalizing treatment that cleanses, exfoliates, and hydrates for a radiant glow.'}
              </Text>
              <View className="gap-2 mb-4">
                {BULLETS.map((b, i) => (
                  <View key={i} className="flex-row">
                    <Text className="text-sm text-ink-soft mr-2">•</Text>
                    <Text className="text-sm text-ink-soft flex-1 leading-5">{b}</Text>
                  </View>
                ))}
              </View>
              <View className="flex-row items-end justify-between">
                <View className="bg-sage-300 rounded-full px-3 py-1">
                  <Text className="text-xs text-ink-soft">{service.category}</Text>
                </View>
                <Text className="text-base text-ink-soft">
                  From <Text className="text-lg font-bold text-ink">${service.price}</Text>
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-surface">
        <GradientButton
          label="Book This Service"
          onPress={() =>
            (nav as any).navigate('SelectTimeSlot', {
              serviceId: service.id,
              vendorId: vendorId ?? service.vendorId,
            })
          }
        />
      </View>
    </SafeAreaView>
  );
}
