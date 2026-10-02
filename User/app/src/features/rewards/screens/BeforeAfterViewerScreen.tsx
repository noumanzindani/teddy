import { View, Text, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';

const PHOTOS_BEFORE = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
  'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
  'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400',
];

export function BeforeAfterViewerScreen() {
  const nav = useNavigation();
  const [tab, setTab] = useState<'before' | 'after'>('before');

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <Text className="text-2xl font-bold text-ink">Before & After</Text>
        <Pressable
          onPress={() => nav.goBack()}
          hitSlop={10}
          className="w-9 h-9 rounded-full bg-sage-300 items-center justify-center"
        >
          <X size={18} color="#1B1B16" />
        </Pressable>
      </View>

      <View className="px-5 mb-4">
        <View className="bg-surface-raised rounded-full flex-row p-1">
          <Pressable
            onPress={() => setTab('before')}
            className={`flex-1 rounded-full py-2 items-center ${tab === 'before' ? 'bg-sage-700' : ''}`}
          >
            <Text className={`text-sm font-medium ${tab === 'before' ? 'text-white' : 'text-ink-muted'}`}>
              Before
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('after')}
            className={`flex-1 rounded-full py-2 items-center ${tab === 'after' ? 'bg-sage-700' : ''}`}
          >
            <Text className={`text-sm font-medium ${tab === 'after' ? 'text-white' : 'text-ink-muted'}`}>
              After
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="px-5 flex-row flex-wrap" style={{ gap: 10 }}>
        {PHOTOS_BEFORE.map((p, i) => (
          <Image
            key={i}
            source={{ uri: p }}
            style={{ width: '31.5%', aspectRatio: 1, borderRadius: 14 }}
            resizeMode="cover"
          />
        ))}
      </View>
    </SafeAreaView>
  );
}
