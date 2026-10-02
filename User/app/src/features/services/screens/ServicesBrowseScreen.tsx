import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell,
  Menu,
  Search,
  ChevronDown,
  SlidersHorizontal,
  Share2,
  MapPin,
  Star,
} from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { api } from '@utils/api';
import type { ApiVendor } from '@utils/api';
import { salons } from '@mock/index';

type Nav = DrawerNavigationProp<any> & { navigate: (s: string, p?: any) => void };

const MOCK_PINS = [
  { id: 's1', name: 'Skincuress Salon',   lat: 56, lng: 22, price: '$89' },
  { id: 's2', name: 'Serenity Spa',       lat: 38, lng: 55, price: '$120' },
  { id: 's3', name: 'Glow Up Aesthetics', lat: 65, lng: 70, price: '$75' },
  { id: 's4', name: 'The Beauty Loft',    lat: 28, lng: 38, price: '$95' },
];

function MapPlaceholder() {
  return (
    <View className="mx-5 rounded-2xl overflow-hidden bg-sage-100" style={{ height: 420 }}>
      {/* Faux map grid */}
      <View className="absolute inset-0">
        {[0, 1, 2, 3, 4].map((r) => (
          <View key={r} className="border-b border-sage-200" style={{ height: '20%' }} />
        ))}
        {[0, 1, 2, 3, 4].map((c) => (
          <View key={c} className="absolute top-0 bottom-0 border-r border-sage-200" style={{ left: `${c * 20}%` }} />
        ))}
      </View>

      {/* Road hints */}
      <View className="absolute left-0 right-0 top-[45%] h-[3px] bg-white/60" />
      <View className="absolute left-0 right-0 top-[68%] h-[2px] bg-white/40" />
      <View className="absolute top-0 bottom-0 left-[35%] w-[2px] bg-white/40" />
      <View className="absolute top-0 bottom-0 left-[62%] w-[3px] bg-white/60" />

      {/* Pins */}
      {MOCK_PINS.map((pin) => (
        <Pressable
          key={pin.id}
          className="absolute items-center active:opacity-80"
          style={{ top: `${pin.lat}%`, left: `${pin.lng}%` }}
        >
          <View className="bg-sage-700 rounded-full px-2.5 py-1 flex-row items-center">
            <Text className="text-white text-xs font-bold">{pin.price}</Text>
          </View>
          <View className="w-0 h-0" style={{
            borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6,
            borderLeftColor: 'transparent', borderRightColor: 'transparent',
            borderTopColor: '#4A5E3A',
          }} />
        </Pressable>
      ))}

      {/* User location dot */}
      <View className="absolute top-[48%] left-[50%] -ml-2.5 -mt-2.5">
        <View className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white" />
        <View className="absolute w-10 h-10 rounded-full bg-blue-400/20 -top-2.5 -left-2.5" />
      </View>

      {/* Map attribution style badge */}
      <View className="absolute bottom-3 right-3 bg-white/80 rounded-lg px-2 py-1">
        <Text className="text-xs text-ink-muted">Map view</Text>
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center py-16">
      <Text className="text-5xl mb-4">🔍</Text>
      <Text className="text-base font-semibold text-ink mb-1">No vendors found</Text>
      <Text className="text-sm text-ink-muted text-center px-8">
        Try adjusting your search or check back later.
      </Text>
    </View>
  );
}

/** Inline vendor card used in the services tab to avoid mismatching the
 *  ServiceCard component's mock-typed Service/Salon props. */
function VendorCard({ vendor, onPress }: { vendor: ApiVendor; onPress: () => void }) {
  const initials = vendor.businessName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      className="bg-surface-raised rounded-2xl overflow-hidden mb-4 active:opacity-90"
    >
      {/* Cover placeholder */}
      <View className="w-full bg-sage-200 items-center justify-center" style={{ height: 120 }}>
        <Text className="text-4xl font-bold text-sage-600">{initials}</Text>
      </View>
      <View className="p-4">
        <View className="flex-row items-start justify-between mb-1">
          <Text className="text-lg font-bold text-ink flex-1">{vendor.businessName}</Text>
          <View className="flex-row items-center ml-2">
            <Star size={14} color="#F5C518" fill="#F5C518" />
            <Text className="ml-1 text-sm font-semibold text-ink">
              {(vendor.rating ?? 4.5).toFixed(1)}
            </Text>
          </View>
        </View>
        {vendor.address ? (
          <View className="flex-row items-center mt-1">
            <MapPin size={12} color="#6B6B62" />
            <Text className="ml-1 text-xs text-ink-muted" numberOfLines={1}>
              {vendor.address}
            </Text>
          </View>
        ) : null}
        {vendor.reviewCount != null && (
          <Text className="text-xs text-ink-muted mt-1">{vendor.reviewCount} reviews</Text>
        )}
      </View>
    </Pressable>
  );
}

export function ServicesBrowseScreen() {
  const nav = useNavigation<Nav>();
  const [tab, setTab] = useState<'services' | 'map' | 'feed'>('services');
  const [search, setSearch] = useState('');

  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get<{ vendors?: ApiVendor[]; data?: ApiVendor[] } | ApiVendor[]>('/vendors')
      .then((res) => {
        if (cancelled) return;
        // The API returns { vendors: [...], meta }; also tolerate { data: [...] } or a bare array.
        const list = Array.isArray(res)
          ? res
          : (res as any).vendors ?? (res as any).data ?? [];
        setVendors(list);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const filteredVendors = vendors.filter((v) =>
    v.businessName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
          <View className="flex-row items-center">
            <Pressable onPress={() => nav.openDrawer?.()} hitSlop={10} className="mr-3">
              <Menu size={24} color="#1B1B16" />
            </Pressable>
            <Text className="text-2xl font-bold text-ink">Explore Services</Text>
          </View>
          <Pressable onPress={() => nav.navigate('Notifications')} hitSlop={10}>
            <Bell size={22} color="#1B1B16" />
          </Pressable>
        </View>

        <View className="px-5 flex-row gap-3 mb-3">
          <View className="flex-1 flex-row items-center bg-surface-input rounded-full px-4 py-2.5">
            <Search size={18} color="#1B1B16" />
            <TextInput
              placeholder="Search"
              placeholderTextColor="#6B6B62"
              value={search}
              onChangeText={setSearch}
              className="ml-2 flex-1 text-base text-ink"
            />
            <View className="flex-row items-center">
              <Text className="text-sm text-ink-soft mr-1">New York,USA</Text>
              <ChevronDown size={16} color="#1B1B16" />
            </View>
          </View>
          <Pressable
            onPress={() => nav.navigate('Filter')}
            className="w-12 h-12 rounded-full bg-sage-600 items-center justify-center active:opacity-80"
          >
            <SlidersHorizontal size={20} color="#FFF" />
          </Pressable>
        </View>

        <View className="px-5 flex-row gap-2 mb-4">
          <Pressable
            onPress={() => setTab('services')}
            className={`px-4 py-1.5 rounded-md ${tab === 'services' ? 'bg-sage-700' : 'bg-transparent border border-sage-300'}`}
          >
            <Text className={`text-sm font-medium ${tab === 'services' ? 'text-white' : 'text-ink-soft'}`}>
              ⌗ Services
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('map')}
            className={`px-4 py-1.5 rounded-md flex-row items-center gap-1 ${tab === 'map' ? 'bg-sage-700' : 'bg-transparent border border-sage-300'}`}
          >
            <MapPin size={12} color={tab === 'map' ? '#FFF' : '#7E8A6E'} />
            <Text className={`text-sm font-medium ${tab === 'map' ? 'text-white' : 'text-ink-soft'}`}>Map</Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('feed')}
            className={`px-4 py-1.5 rounded-md ${tab === 'feed' ? 'bg-sage-700' : 'bg-transparent border border-sage-300'}`}
          >
            <Text className={`text-sm font-medium ${tab === 'feed' ? 'text-white' : 'text-ink-soft'}`}>
              ⊞ Feed
            </Text>
          </Pressable>
        </View>

        {tab === 'map' && (
          <>
            <MapPlaceholder />
            <View className="px-5 mt-4">
              <Text className="text-sm font-semibold text-ink mb-3">Nearby Salons</Text>
              {MOCK_PINS.map((pin) => (
                <View key={pin.id} className="bg-surface-raised rounded-2xl p-4 mb-3 flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-sage-700 items-center justify-center mr-3">
                    <MapPin size={16} color="#FFF" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-ink">{pin.name}</Text>
                    <Text className="text-xs text-ink-muted">0.{pin.id.slice(-1)}2 mi away</Text>
                  </View>
                  <Text className="text-sm font-semibold text-sage-700">from {pin.price}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {tab === 'services' && (
          <View className="px-5">
            {loading && (
              <View className="py-12 items-center">
                <ActivityIndicator size="large" color="#4A5E3A" />
                <Text className="text-sm text-ink-muted mt-3">Loading vendors…</Text>
              </View>
            )}

            {!loading && error && (
              <View className="py-8 items-center">
                <Text className="text-sm text-red-500 text-center">{error}</Text>
              </View>
            )}

            {!loading && !error && filteredVendors.length === 0 && <EmptyState />}

            {!loading && !error && filteredVendors.map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                onPress={() => nav.navigate('SalonProfile', { salonId: vendor.id })}
              />
            ))}
          </View>
        )}

        {tab === 'feed' && (
          <View className="px-5">
            {salons.flatMap((salon) =>
              salon.feedPosts.map((post) => (
                <View key={post.id} className="bg-surface-raised rounded-2xl overflow-hidden mb-4">
                  <View className="flex-row items-center p-3">
                    <View className="w-10 h-10 rounded-full bg-sage-700 mr-3" />
                    <View className="flex-1">
                      <Text className="text-base font-bold text-ink">{salon.name}</Text>
                      <Text className="text-xs text-ink-muted">{post.createdAt}</Text>
                    </View>
                  </View>
                  <Text className="text-sm text-ink-soft px-3 mb-3 leading-5">
                    Lorem ipsum is simply dummy text of the printing and typesetting industry.{' '}
                    <Text className="font-bold">See more</Text>
                  </Text>
                  <View className="relative">
                    <Image
                      source={{ uri: post.mediaUrl }}
                      style={{ width: '100%', height: 280 }}
                      resizeMode="cover"
                    />
                    <View className="absolute top-3 right-3 bg-white/95 rounded-full px-3 py-1.5 flex-row items-center">
                      <Share2 size={12} color="#1B1B16" />
                      <Text className="ml-1.5 text-xs font-medium text-ink">Share</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
