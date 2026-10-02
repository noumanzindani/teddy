import { View, Text, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useNavigation, useRoute, type RouteProp, CommonActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { GradientButton } from '@components/primitives';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList>;
type R = RouteProp<AuthStackParamList, 'OtpVerification'>;

const OTP_LENGTH = 6;

export function OtpVerificationScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const phoneDisplay = route.params?.phone || '+1 XXX XXX XXXX';

  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(50);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  const isComplete = code.length === OTP_LENGTH;

  const handleVerify = () => {
    nav.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Onboarding' as never }] })
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 px-6">
          <Pressable onPress={() => nav.goBack()} hitSlop={10} className="pt-4">
            <ChevronLeft size={28} color="#1B1B16" />
          </Pressable>

          <Text className="text-4xl font-bold text-ink mt-6">Enter 6 Digit Code</Text>
          <Text className="text-base text-ink-soft mt-2">
            Enter the 6 digit code that sent to your phone number
          </Text>
          <Text className="text-base text-ink-soft">{phoneDisplay}</Text>

          <Pressable className="mt-10" onPress={() => inputRef.current?.focus()}>
            <View className="flex-row justify-between">
              {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                const digit = code[i] ?? '';
                const isActive = i === code.length;
                return (
                  <View
                    key={i}
                    className={`w-12 h-14 rounded-2xl bg-surface-input items-center justify-center ${
                      isActive ? 'border border-gold-600' : ''
                    }`}
                  >
                    <Text className="text-2xl font-bold text-ink">{digit}</Text>
                  </View>
                );
              })}
            </View>
          </Pressable>

          {/* Hidden input that captures keystrokes */}
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, OTP_LENGTH))}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
          />

          <View className="items-center mt-6">
            {seconds > 0 ? (
              <Text className="text-base font-semibold text-ink">
                Resend {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
              </Text>
            ) : (
              <Pressable onPress={() => setSeconds(50)} hitSlop={6}>
                <Text className="text-base font-semibold text-gold-700">Resend code</Text>
              </Pressable>
            )}
          </View>

          <View className="flex-1" />

          <View className="pb-6">
            <GradientButton label="Verify" onPress={handleVerify} disabled={!isComplete} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
