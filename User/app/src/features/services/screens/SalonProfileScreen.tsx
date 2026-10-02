import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { ChevronLeft, Bell, Star, MapPin, Play, Phone, Heart } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientButton, SegmentedControl } from '@components/primitives';
import { api } from '@utils/api';
import type { ApiVendor, ApiService } from '@utils/api';
import type { RootStackParamList } from '@navigation/types';

type R = RouteProp<RootStackParamList, 'SalonProfile'>;
type Tab = 'feed' | 'services' | 'reviews' | 'info';

const COVER_PLACEHOLDER = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800';

/** Convert openHours record to a flat array for the hours tab. */
function parseOpenHours(
  openHours?: Record<string, { open: boolean; from: string; to: string }> | null
): { day: string; open: string; close: string }[] {
  if (!openHours) return [];
  return Object.entries(openHours)
    .filter(([, v]) => v.open)
    .map(([day, v]) => ({ day, open: v.from, close: v.to }));
}

export function SalonProfileScreen() {
  const nav = useNavigation();
  const route = useRoute<R>();
  // salonId in navigation params == vendorId in the backend
  const { salonId } = route.params;

  const [vendor, setVendor] = useState<ApiVendor | null>(null);
  const [salonServices, setSalonServices] = useState<ApiService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('feed');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      api.get<ApiVendor>('/vendors/' + salonId),
      api.get<ApiService[]>('/services/' + salonId),
    ])
      .then(([vendorData, servicesData]) => {
        if (cancelled) return;
        setVendor(vendorData);
        setSalonServices(Array.isArray(servicesData) ? servicesData : []);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [salonId]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color="#4A5E3A" />
        <Text className="text-sm text-ink-muted mt-3">Loading profile…</Text>
      </SafeAreaView>
    );
  }

  if (error || !vendor) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center" edges={['top']}>
        <Pressable onPress={() => nav.goBack()} hitSlop={10} className="absolute top-12 left-5">
          <ChevronLeft size={26} color="#1B1B16" />
        </Pressable>
        <Text className="text-base font-semibold text-ink mb-2">Could not load profile</Text>
        <Text className="text-sm text-ink-muted text-center px-8">{error ?? 'Unknown error'}</Text>
      </SafeAreaView>
    );
  }

  // Map ApiVendor → local display shape
  const salon = {
    name: vendor.businessName,
    avatarInitials: vendor.businessName
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase(),
    coverUrl: vendor.coverUrl ?? COVER_PLACEHOLDER,
    rating: vendor.rating ?? 0,
    reviewCount: vendor.reviewCount ?? 0,
    location: vendor.address ?? '',
    specializations: ['Skincare', 'Wellness'] as string[], // placeholder — not in API yet
    bio: vendor.bio ?? '',
    hours: parseOpenHours(vendor.openHours),
    feedPosts: [] as { id: string; mediaUrl: string; type: 'image'; caption: string; createdAt: string }[],
  };

  // Feed grid: show service images as placeholder media
  const feedMedia = salonServices.slice(0, 6).map((s, i) => ({
    id: s.id,
    mediaUrl: s.imageUrl ?? COVER_PLACEHOLDER,
    type: 'image' as const,
    caption: s.name,
    createdAt: '',
    isVideo: i % 2 === 0,
  }));

  const firstService = salonServices[0];

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']} style={{ backgroundColor: '#F5F4EC' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View className="relative">
          <Image source={{ uri: salon.coverUrl }} style={{ width: '100%', height: 200 }} resizeMode="cover" />
          <View className="absolute top-4 left-4 right-4 flex-row items-center justify-between">
            <Pressable onPress={() => nav.goBack()} hitSlop={10} className="w-10 h-10 rounded-full bg-white/90 items-center justify-center">
              <ChevronLeft size={22} color="#1B1B16" />
            </Pressable>
            <View className="flex-row gap-2">
              <Pressable hitSlop={10} className="w-10 h-10 rounded-full bg-white/90 items-center justify-center">
                <Heart size={20} color="#1B1B16" />
              </Pressable>
              <Pressable hitSlop={10} className="w-10 h-10 rounded-full bg-white/90 items-center justify-center">
                <Bell size={20} color="#1B1B16" />
              </Pressable>
            </View>
          </View>
        </View>

        <View className="px-5 -mt-10">
          <View className="bg-surface-raised rounded-2xl p-4">
            <Text className="text-2xl font-bold text-ink">Providers Profile</Text>
            <View className="flex-row items-center mt-2">
              <View className="w-10 h-10 rounded-full bg-sage-700 items-center justify-center mr-3">
                <Text className="text-white text-xs font-bold">{salon.avatarInitials}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-ink">{salon.name}</Text>
                <View className="flex-row items-center mt-0.5">
                  <Star size={12} color="#F5A623" fill="#F5A623" />
                  <Text className="ml-1 text-xs text-ink-muted">
                    {salon.rating} ({salon.reviewCount})
                  </Text>
                  {salon.location ? (
                    <>
                      <MapPin size={12} color="#6B6B62" style={{ marginLeft: 8 }} />
                      <Text className="ml-1 text-xs text-ink-muted">{salon.location}</Text>
                    </>
                  ) : null}
                </View>
              </View>
            </View>
            <View className="flex-row flex-wrap gap-2 mt-3">
              {salon.specializations.map((s) => (
                <View key={s} className="bg-sage-300 rounded-full px-3 py-1">
                  <Text className="text-xs text-ink-soft">{s}</Text>
                </View>
              ))}
              <View className="bg-sage-300 rounded-full px-3 py-1">
                <Text className="text-xs text-ink-soft">Cosmetic Surgeon</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-5 mt-5 mb-3">
          <SegmentedControl<Tab>
            value={tab}
            onChange={setTab}
            scrollable
            options={[
              { value: 'feed', label: 'Feed' },
              { value: 'services', label: 'Services' },
              { value: 'reviews', label: 'Reviews' },
              { value: 'info', label: 'Info' },
            ]}
          />
        </View>

        {tab === 'feed' && (
          <View className="px-5">
            <Text className="text-base font-bold text-ink mb-3">Stay Calm All</Text>
            {feedMedia.length === 0 ? (
              <Text className="text-sm text-ink-muted text-center py-8">No posts yet.</Text>
            ) : (
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {feedMedia.map((m) => (
                  <View key={m.id} style={{ width: '48%', height: 130, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
                    <Image source={{ uri: m.mediaUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    {m.isVideo && (
                      <View className="absolute inset-0 items-center justify-center">
                        <View className="w-9 h-9 rounded-full bg-white/80 items-center justify-center">
                          <Play size={16} color="#1B1B16" fill="#1B1B16" />
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {tab === 'services' && (
          <View className="px-5 gap-3">
            {salonServices.length === 0 && (
              <Text className="text-sm text-ink-muted text-center py-8">No services listed yet.</Text>
            )}
            {salonServices.map((sv) => (
              <Pressable
                key={sv.id}
                onPress={() => (nav as any).navigate('ServiceDetail', { serviceId: sv.id, vendorId: salonId })}
                className="bg-surface-raised rounded-2xl p-3 flex-row active:opacity-90"
              >
                <Image
                  source={{ uri: sv.imageUrl ?? COVER_PLACEHOLDER }}
                  style={{ width: 80, height: 80, borderRadius: 12 }}
                />
                <View className="flex-1 ml-3 justify-between">
                  <View>
                    <Text className="text-base font-bold text-ink">{sv.name}</Text>
                    <Text className="text-xs text-ink-muted mt-0.5" numberOfLines={1}>
                      {sv.durationMin} min · {sv.category}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-bold text-ink">${sv.price}</Text>
                    <View className="bg-sage-700 rounded-full px-3 py-1">
                      <Text className="text-xs font-semibold text-white">Book</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {tab === 'reviews' && (
          <View className="px-5 gap-3">
            <View className="bg-surface-raised rounded-2xl p-4 flex-row items-center">
              <Text className="text-3xl font-bold text-ink mr-3">{salon.rating}</Text>
              <View className="flex-1">
                <View className="flex-row mb-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} size={14} color="#F5A623" fill={n <= Math.round(salon.rating) ? '#F5A623' : 'transparent'} />
                  ))}
                </View>
                <Text className="text-xs text-ink-muted">{salon.reviewCount} reviews</Text>
              </View>
            </View>
            {[1, 2, 3].map((i) => (
              <View key={i} className="bg-surface-raised rounded-2xl p-4">
                <View className="flex-row items-center mb-2">
                  <View className="w-9 h-9 rounded-full bg-sage-300 mr-2" />
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-ink">Sarah M.</Text>
                    <View className="flex-row items-center">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} size={11} color="#F5A623" fill="#F5A623" />
                      ))}
                      <Text className="ml-2 text-xs text-ink-muted">2 days ago</Text>
                    </View>
                  </View>
                </View>
                <Text className="text-sm text-ink-soft leading-5">
                  Amazing experience — the esthetician was incredibly knowledgeable and my skin looks great!
                </Text>
              </View>
            ))}
          </View>
        )}

        {tab === 'info' && (
          <View className="px-5 gap-3">
            <View className="bg-surface-raised rounded-2xl p-4">
              <Text className="text-base font-bold text-ink mb-2">About</Text>
              <Text className="text-sm text-ink-soft leading-5">
                {salon.bio || 'No description provided.'}
              </Text>
            </View>
            {salon.location ? (
              <View className="bg-surface-raised rounded-2xl p-4">
                <Text className="text-base font-bold text-ink mb-2">Location</Text>
                <View className="flex-row items-center">
                  <MapPin size={16} color="#1B1B16" />
                  <Text className="ml-2 text-sm text-ink-soft">{salon.location}</Text>
                </View>
              </View>
            ) : null}
            <View className="bg-surface-raised rounded-2xl p-4">
              <Text className="text-base font-bold text-ink mb-2">Contact</Text>
              <View className="flex-row items-center">
                <Phone size={16} color="#1B1B16" />
                <Text className="ml-2 text-sm text-ink-soft">+1 555 123 4567</Text>
              </View>
            </View>
            {salon.hours.length > 0 && (
              <View className="bg-surface-raised rounded-2xl p-4">
                <Text className="text-base font-bold text-ink mb-2">Hours</Text>
                {salon.hours.map((h) => (
                  <View key={h.day} className="flex-row justify-between py-1">
                    <Text className="text-sm text-ink">{h.day}</Text>
                    <Text className="text-sm text-ink-muted">{h.open} – {h.close}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-surface">
        <GradientButton
          label="Book Now"
          onPress={() =>
            firstService
              ? (nav as any).navigate('ServiceDetail', { serviceId: firstService.id, vendorId: salonId })
              : (nav as any).navigate('ServiceDetail', { serviceId: '', vendorId: salonId })
          }
          disabled={!firstService}
        />
      </View>
    </SafeAreaView>
  );
}
