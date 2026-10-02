import { View, Text, Pressable, Image } from 'react-native';
import { Star, Coffee } from 'lucide-react-native';
import type { Service, Salon } from '@app-types/index';

interface Props {
  service: Service;
  salon?: Salon;
  onPress?: () => void;
}

export function ServiceCard({ service, salon, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-surface-raised rounded-2xl overflow-hidden mb-4 active:opacity-90"
    >
      <View className="relative">
        <Image
          source={{ uri: service.imageUrl }}
          style={{ width: '100%', height: 180 }}
          resizeMode="cover"
        />
        <View className="absolute top-3 right-3 bg-white/95 rounded-full px-3 py-1">
          <Text className="text-xs text-ink font-medium">Est. Duration {service.durationMin} min</Text>
        </View>
        {salon && (
          <View className="absolute bottom-3 left-3 bg-white/95 rounded-full pl-1.5 pr-3 py-1 flex-row items-center">
            <View className="w-7 h-7 rounded-full bg-sage-700 items-center justify-center mr-2">
              <Coffee size={14} color="#FFF" />
            </View>
            <Text className="text-xs font-semibold text-ink">{salon.name}</Text>
          </View>
        )}
      </View>
      <View className="p-4">
        <View className="flex-row items-start justify-between mb-1">
          <Text className="text-lg font-bold text-ink flex-1">{service.name}</Text>
          <View className="flex-row items-center ml-2">
            <Star size={14} color="#F5C518" fill="#F5C518" />
            <Text className="ml-1 text-sm font-semibold text-ink">{service.rating.toFixed(1)}</Text>
          </View>
        </View>
        <Text className="text-sm text-ink-soft leading-5" numberOfLines={2}>
          {service.description}
        </Text>
        <View className="flex-row items-end justify-between mt-3">
          <View className="bg-sage-300 rounded-full px-3 py-1">
            <Text className="text-xs text-ink-soft">Distance {service.distanceKm} km away</Text>
          </View>
          <Text className="text-base text-ink-soft">
            From <Text className="text-lg font-bold text-ink">${service.price}</Text>
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
