import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { useState } from 'react';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Mail, Lock, Phone, ChevronDown } from 'lucide-react-native';
import { GradientButton, PillInput, TeddyLogo, SocialAuthRow } from '@components/primitives';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@navigation/types';
import { useAuth, useUser } from '@store/index';
import { registerUser } from '@utils/api';

type Nav = NativeStackNavigationProp<AuthStackParamList>;

function Checkbox({ checked, onPress }: { checked: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`w-5 h-5 rounded border ${checked ? 'bg-sage-700 border-sage-700' : 'bg-transparent border-sage-400'} items-center justify-center`}
    >
      {checked && <Text className="text-white text-xs leading-3">✓</Text>}
    </Pressable>
  );
}

function CountryCodeSlot() {
  return (
    <View className="flex-row items-center mr-3 pr-3 border-r border-sage-300">
      <Text className="text-base mr-1">🇺🇸</Text>
      <ChevronDown size={14} color="#1B1B16" />
      <Text className="ml-2 text-base text-ink">+1</Text>
    </View>
  );
}

export function SignUpScreen() {
  const nav = useNavigation<Nav>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    setError('');
    if (!name.trim()) { setError('Full name is required.'); return; }
    if (!email.trim()) { setError('Email is required.'); return; }
    if (!phone.trim()) { setError('Phone number is required.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (!agreed) { setError('You must agree to the Terms & Privacy Policy.'); return; }

    const parts = name.trim().split(' ');
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '';

    setLoading(true);
    try {
      const data = await registerUser({ firstName, lastName, email: email.trim(), phone: phone.trim(), password });
      useAuth.getState().setToken(data.accessToken);
      useUser.getState().setFromApi(data.user);
      nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Onboarding' as never }] }));
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center pt-8 pb-6">
            <TeddyLogo variant="dark" size="sm" />
          </View>

          <Text className="text-4xl font-bold text-ink mb-2">Signup</Text>
          <Text className="text-base text-ink-soft mb-6">
            Create your account to explore about our app
          </Text>

          {!!error && (
            <View className="bg-danger/10 border border-danger/30 rounded-2xl px-4 py-3 mb-4">
              <Text className="text-sm text-danger">{error}</Text>
            </View>
          )}

          <View className="gap-3.5">
            <PillInput
              leftIcon={<User size={20} color="#1B1B16" />}
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
            />
            <PillInput
              leftIcon={<Mail size={20} color="#1B1B16" />}
              placeholder="Email Address"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <View className="flex-row items-center bg-surface-input rounded-full px-5 py-3.5">
              <Phone size={20} color="#1B1B16" />
              <View className="ml-3 flex-1 flex-row items-center">
                <CountryCodeSlot />
                <TextInput
                  className="flex-1 text-base text-ink"
                  placeholder="000 0000 00"
                  placeholderTextColor="#6B6B62"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </View>
            <PillInput
              leftIcon={<Lock size={20} color="#1B1B16" />}
              placeholder="Password"
              isPassword
              value={password}
              onChangeText={setPassword}
            />
            <PillInput
              leftIcon={<Lock size={20} color="#1B1B16" />}
              placeholder="Confirm Password"
              isPassword
              value={confirm}
              onChangeText={setConfirm}
            />
          </View>

          <Pressable
            onPress={() => setAgreed((a) => !a)}
            className="flex-row items-center mt-4 mb-6 px-1"
            hitSlop={6}
          >
            <Checkbox checked={agreed} onPress={() => setAgreed((a) => !a)} />
            <Text className="ml-2 text-sm text-ink-soft">
              I agree to the Terms & Privacy Policy
            </Text>
          </Pressable>

          <GradientButton label="Signup" onPress={handleSignup} disabled={loading} />

          <View className="mt-6">
            <SocialAuthRow />
          </View>

          <View className="flex-row justify-center mt-8">
            <Text className="text-sm text-ink-soft">Have An Account? </Text>
            <Pressable onPress={() => nav.navigate('Login')} hitSlop={6}>
              <Text className="text-sm font-bold text-ink">Login</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
