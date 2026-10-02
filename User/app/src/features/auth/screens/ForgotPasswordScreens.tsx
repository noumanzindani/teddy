import { View, Text, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Mail, Lock } from 'lucide-react-native';
import { Image } from 'react-native';
import { GradientButton, PillInput } from '@components/primitives';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList>;

function BackHeader() {
  const nav = useNavigation<Nav>();
  return (
    <Pressable onPress={() => nav.goBack()} hitSlop={10} className="pt-4">
      <ChevronLeft size={28} color="#1B1B16" />
    </Pressable>
  );
}

export function ForgotPasswordEmailScreen() {
  const nav = useNavigation<Nav>();
  const [email, setEmail] = useState('');
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-1 px-6">
          <BackHeader />
          <Text className="text-4xl font-bold text-ink mt-6">Forgot Your Passwords</Text>
          <Text className="text-sm text-ink-soft mt-2 mb-8">
            'Enter your registered email address and we'll send you a reset link
          </Text>
          <PillInput
            leftIcon={<Mail size={20} color="#1B1B16" />}
            placeholder="Email Address"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <View className="flex-1" />
          <View className="pb-6">
            <GradientButton label="Send Reset Link" onPress={() => nav.navigate('ForgotPasswordCheck')} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MailIllustration() {
  return (
    <View className="items-center justify-center" style={{ width: 120, height: 90 }}>
      {/* Sparkles */}
      <Text style={{ position: 'absolute', top: 4, left: 8, fontSize: 14 }}>✨</Text>
      <Text style={{ position: 'absolute', top: 0, right: 12, fontSize: 16 }}>⚡</Text>
      <Text style={{ position: 'absolute', bottom: 8, left: 0, fontSize: 12 }}>☁️</Text>
      <Text style={{ position: 'absolute', bottom: 4, right: 0, fontSize: 12 }}>☁️</Text>
      {/* Envelope */}
      <View className="w-20 h-14 bg-sage-600 rounded-md items-center justify-center" style={{ borderWidth: 2, borderColor: '#5F6B52' }}>
        <View className="w-16 h-1 bg-sage-700" />
        <View className="absolute -top-1 w-20 h-7" style={{ borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#5F6B52' }} />
      </View>
    </View>
  );
}

export function ForgotPasswordCheckScreen() {
  const nav = useNavigation<Nav>();
  return (
    <View className="flex-1 bg-sage-200/40 items-center justify-center px-6">
      <View className="bg-white rounded-3xl px-6 py-7 w-full max-w-sm items-center">
        <MailIllustration />
        <Text className="text-2xl font-bold text-ink mt-2 text-center">Check your email!</Text>
        <Text className="text-sm text-ink-soft text-center mt-2">
          'We sent a reset link to [email address]
        </Text>
        <View className="flex-row gap-3 mt-5">
          <Pressable
            onPress={() => nav.navigate('Login')}
            className="bg-sage-200 rounded-full px-5 py-3 active:opacity-80"
          >
            <Text className="text-base font-semibold text-ink">Back to Login</Text>
          </Pressable>
          <Pressable className="active:opacity-80">
            <View
              className="rounded-full px-5 py-3"
              style={{ backgroundColor: '#B89766' }}
            >
              <Text className="text-base font-semibold text-ink">Resend email</Text>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function SetNewPasswordScreen() {
  const nav = useNavigation<Nav>();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-1 px-6">
          <BackHeader />
          <Text className="text-4xl font-bold text-ink mt-6 mb-8">Set New Password</Text>
          <View className="gap-3.5">
            <PillInput
              leftIcon={<Lock size={20} color="#1B1B16" />}
              placeholder="Password"
              isPassword
              value={pw}
              onChangeText={setPw}
            />
            <PillInput
              leftIcon={<Lock size={20} color="#1B1B16" />}
              placeholder="Confirm Password"
              isPassword
              value={confirm}
              onChangeText={setConfirm}
            />
          </View>
          <View className="flex-1" />
          <View className="pb-6">
            <GradientButton label="Save Password" onPress={() => nav.navigate('Login')} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
