import { View, Text, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Lock } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { GradientButton, PillInput } from '@components/primitives';
import { api } from '@utils/api';

export function ChangePasswordScreen() {
  const nav = useNavigation();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    setError('');
    setSuccess(false);
    if (!current.trim()) { setError('Please enter your current password.'); return; }
    if (next.length < 8) { setError('New password must be at least 8 characters.'); return; }
    if (next !== confirm) { setError('New passwords do not match.'); return; }

    setSaving(true);
    try {
      await api.patch('/users/me', { currentPassword: current, newPassword: next });
      setSuccess(true);
      setTimeout(() => nav.goBack(), 800);
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-1 px-6">
          <View className="flex-row items-center pt-4 pb-6">
            <Pressable onPress={() => nav.goBack()} hitSlop={10} className="mr-3">
              <ChevronLeft size={26} color="#1B1B16" />
            </Pressable>
            <Text className="text-2xl font-bold text-ink">Change Password</Text>
          </View>

          <View className="gap-3.5">
            <PillInput
              leftIcon={<Lock size={20} color="#1B1B16" />}
              placeholder="Current Password"
              isPassword
              value={current}
              onChangeText={setCurrent}
            />
            <PillInput
              leftIcon={<Lock size={20} color="#1B1B16" />}
              placeholder="New Password"
              isPassword
              value={next}
              onChangeText={setNext}
            />
            <PillInput
              leftIcon={<Lock size={20} color="#1B1B16" />}
              placeholder="Confirm Password"
              isPassword
              value={confirm}
              onChangeText={setConfirm}
            />
          </View>

          {success && (
            <View className="bg-green-100 border border-green-300 rounded-2xl px-4 py-3 mt-4">
              <Text className="text-sm font-semibold text-green-700">Password updated!</Text>
            </View>
          )}
          {!!error && (
            <View className="bg-danger/10 border border-danger/30 rounded-2xl px-4 py-3 mt-4">
              <Text className="text-sm text-danger">{error}</Text>
            </View>
          )}

          <View className="flex-1" />
          <View className="pb-6">
            <GradientButton label="Save" onPress={handleSave} disabled={saving} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
