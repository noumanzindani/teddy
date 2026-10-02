import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Bell, Star, MapPin, Heart } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

const FAVORITES = [
  { id: 'f1', name: 'Zenith Wellness', rating: 4.5, location: 'Los Angeles, CA', avatar: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=100' },
  { id: 'f2', name: 'Serenity Spa', rating: 4.7, location: 'Austin, TX', avatar: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=100' },
  { id: 'f3', name: 'Radiant Skin Co.', rating: 4.9, location: 'Seattle, WA', avatar: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=100' },
];

export function FavoritesScreen() {
  const nav = useNavigation();

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <View className="flex-row items-center">
          <Pressable onPress={() => nav.goBack()} hitSlop={10} className="mr-3">
            <ChevronLeft size={26} color="#1B1B16" />
          </Pressable>
          <Text className="text-2xl font-bold text-ink">Favorites</Text>
        </View>
        <Pressable hitSlop={10}>
          <Bell size={22} color="#1B1B16" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {FAVORITES.map((f) => (
          <Pressable
            key={f.id}
            className="bg-surface-raised rounded-2xl p-3 mb-3 flex-row items-center active:opacity-90"
          >
            <Image source={{ uri: f.avatar }} style={{ width: 48, height: 48, borderRadius: 24 }} />
            <View className="flex-1 ml-3">
              <View className="flex-row items-center">
                <Text className="text-base font-bold text-ink">{f.name}</Text>
                <View className="bg-sage-300 rounded-full px-2 py-0.5 ml-2 flex-row items-center">
                  <Star size={10} color="#1B1B16" fill="#1B1B16" />
                  <Text className="text-xs text-ink ml-1">{f.rating}</Text>
                </View>
              </View>
              <View className="flex-row items-center mt-1">
                <MapPin size={12} color="#6B6B62" />
                <Text className="text-xs text-ink-muted ml-1">{f.location}</Text>
              </View>
            </View>
            <Pressable hitSlop={6}>
              <Heart size={20} color="#7E8A6E" fill="#7E8A6E" />
            </Pressable>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
