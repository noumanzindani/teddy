import { View, Text, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { GradientButton, PillInput } from '@components/primitives';

export function CardFormScreen({ mode }: { mode: 'add' | 'edit' }) {
  const nav = useNavigation();
  const [holder, setHolder] = useState(mode === 'edit' ? 'John Smith' : '');
  const [number, setNumber] = useState(mode === 'edit' ? '4000 1234 5678 9012' : '');
  const [exp, setExp] = useState(mode === 'edit' ? '01/30' : '');
  const [cvv, setCvv] = useState('');

  return (
    <View className="flex-1 bg-black/40 justify-end">
      <Pressable className="flex-1" onPress={() => nav.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView edges={['bottom']} className="bg-surface rounded-t-3xl">
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-sage-700" />
          </View>
          <View className="px-6 pt-3 pb-4">
            <Text className="text-2xl font-bold text-ink mb-4">{mode === 'add' ? 'Add New Card' : 'Edit Card'}</Text>
            <View className="gap-3">
              <PillInput placeholder="Card Holder name" value={holder} onChangeText={setHolder} />
              <PillInput
                placeholder="Card Number"
                keyboardType="number-pad"
                value={number}
                onChangeText={setNumber}
              />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <PillInput placeholder="Expiration Date" value={exp} onChangeText={setExp} />
                </View>
                <View className="flex-1">
                  <PillInput placeholder="CVV" keyboardType="number-pad" secureTextEntry value={cvv} onChangeText={setCvv} />
                </View>
              </View>
            </View>
            <View className="mt-4">
              <GradientButton label="Save" onPress={() => nav.goBack()} />
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

export const AddNewCardScreen = () => <CardFormScreen mode="add" />;
export const EditCardScreen = () => <CardFormScreen mode="edit" />;
