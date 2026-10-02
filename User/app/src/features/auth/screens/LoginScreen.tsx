import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, AlertTriangle } from 'lucide-react-native';
import { GradientButton, PillInput, TeddyLogo, SocialAuthRow } from '@components/primitives';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList, RootStackParamList } from '@navigation/types';
import { useAuth, useUser } from '@store/index';
import { loginWithEmail } from '@utils/api';

type Nav = NativeStackNavigationProp<AuthStackParamList & RootStackParamList>;

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

function formatMs(ms: number) {
  const totalSecs = Math.ceil(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function LoginScreen() {
  const nav = useNavigation<Nav>();
  const { setToken, recordFailedAttempt, resetAttempts, isLocked, lockRemainingMs, loginAttempts } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);

  // Tick the countdown while locked
  useEffect(() => {
    if (!isLocked()) return;
    setCountdown(lockRemainingMs());
    const interval = setInterval(() => {
      const rem = lockRemainingMs();
      setCountdown(rem);
      if (rem <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [isLocked, lockRemainingMs]);

  const handleLogin = useCallback(async () => {
    setError('');
    if (isLocked()) return;

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const data = await loginWithEmail(email.trim(), password);
      useAuth.getState().setToken(data.accessToken);
      useUser.getState().setFromApi(data.user);
      nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'MainDrawer' as never }] }));
    } catch (err: any) {
      recordFailedAttempt();
      const attemptsAfter = loginAttempts + 1;
      if (attemptsAfter >= 3) {
        setCountdown(lockRemainingMs());
        setError('');
      } else {
        setError(err?.message || `Incorrect email or password. ${3 - attemptsAfter} attempt${3 - attemptsAfter === 1 ? '' : 's'} remaining.`);
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, isLocked, loginAttempts, lockRemainingMs, recordFailedAttempt, nav]);

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
          <View className="items-center pt-8 pb-10">
            <TeddyLogo variant="dark" size="md" />
          </View>

          <Text className="text-4xl font-bold text-ink mb-2">Login</Text>
          <Text className="text-base text-ink-soft mb-8">
            Trusted estheticians. Easy scheduling. Real results.
          </Text>

          {/* Account locked banner */}
          {isLocked() && countdown > 0 && (
            <View className="bg-danger/10 border border-danger/30 rounded-2xl px-4 py-3.5 flex-row items-start gap-3 mb-2">
              <AlertTriangle size={18} color="#EF4444" style={{ marginTop: 1 }} />
              <View className="flex-1">
                <Text className="text-sm font-bold text-danger">Account Temporarily Locked</Text>
                <Text className="text-xs text-danger/80 mt-0.5">
                  Too many failed attempts. Try again in {formatMs(countdown)}.
                </Text>
              </View>
            </View>
          )}

          <View className="gap-4">
            <PillInput
              leftIcon={<Mail size={20} color="#1B1B16" />}
              placeholder="Email Address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              editable={!isLocked()}
            />
            <PillInput
              leftIcon={<Lock size={20} color="#1B1B16" />}
              placeholder="Password"
              isPassword
              value={password}
              onChangeText={setPassword}
              editable={!isLocked()}
            />
          </View>

          {/* Per-attempt error */}
          {!!error && !isLocked() && (
            <View className="bg-danger/10 border border-danger/30 rounded-2xl px-4 py-3 mt-3">
              <Text className="text-sm text-danger">{error}</Text>
            </View>
          )}

          <View className="flex-row items-center justify-between mt-4 mb-8 px-1">
            <Pressable
              onPress={() => setRemember((r) => !r)}
              className="flex-row items-center"
              hitSlop={6}
            >
              <Checkbox checked={remember} onPress={() => setRemember((r) => !r)} />
              <Text className="ml-2 text-sm text-ink-soft">Remember me</Text>
            </Pressable>
            <Pressable onPress={() => nav.navigate('ForgotPasswordEmail')} hitSlop={6}>
              <Text className="text-sm font-semibold text-ink">Forgot password?</Text>
            </Pressable>
          </View>

          <GradientButton label="Login" onPress={handleLogin} disabled={isLocked() || loading} />

          <View className="mt-8">
            <SocialAuthRow />
          </View>

          <View className="flex-row justify-center mt-8">
            <Text className="text-sm text-ink-soft">Don't have An Account? </Text>
            <Pressable onPress={() => nav.navigate('SignUp')} hitSlop={6}>
              <Text className="text-sm font-bold text-ink">Signup</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
