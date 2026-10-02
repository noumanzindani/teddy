import { View, Text, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Bell, Info, AlertTriangle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';

export function GiftCardsScreen() {
  const nav = useNavigation();
  const [code, setCode] = useState('');
  const [balance] = useState(1250);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <View className="flex-row items-center">
          <Pressable onPress={() => nav.goBack()} hitSlop={10} className="mr-3">
            <ChevronLeft size={26} color="#1B1B16" />
          </Pressable>
          <Text className="text-2xl font-bold text-ink">Gift Cards</Text>
        </View>
        <Pressable hitSlop={10}><Bell size={22} color="#1B1B16" /></Pressable>
      </View>

      <View className="px-5 pt-2">
        <Text className="text-base font-bold text-ink mb-3">Redeem Gift Card</Text>

        <View className="bg-surface-raised rounded-2xl p-4">
          <View className="bg-surface-input rounded-full px-4 py-3.5">
            <TextInput
              placeholder="Enter gift card code"
              placeholderTextColor="#6B6B62"
              value={code}
              onChangeText={setCode}
              className="text-base text-ink"
            />
          </View>
          <Pressable className="bg-sage-700 rounded-full mt-3 py-3 items-center active:opacity-90">
            <Text className="text-base font-bold text-white">Apply</Text>
          </Pressable>
        </View>

        <View className="bg-surface-raised rounded-2xl p-5 mt-4">
          <Text className="text-sm text-ink-muted">Gift Card Balance</Text>
          <Text className="text-4xl font-bold text-ink mt-1">${balance.toLocaleString()}</Text>
          <View className="flex-row items-center bg-sage-300 rounded-full px-3 py-2 mt-3">
            <Info size={14} color="#1B1B16" />
            <Text className="text-xs text-ink-soft ml-1.5">This balance will be applied at checkout</Text>
          </View>
        </View>

        <View className="bg-warning rounded-2xl p-4 mt-4 flex-row">
          <View className="w-10 h-10 rounded-xl bg-orange-200 items-center justify-center mr-3">
            <AlertTriangle size={20} color="#D88A2A" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-white">Note</Text>
            <Text className="text-xs text-white/90 mt-1 leading-5">
              Gift cards can be redeemed at checkout for any service across the Indigo Vault ecosystem.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
