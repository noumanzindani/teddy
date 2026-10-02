import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { GradientButton } from '@components/primitives';
import { useUser } from '@store/index';
import { api } from '@utils/api';

function Field({ label, value, onChangeText, placeholder, keyboardType }: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-ink mb-1.5">{label}</Text>
      <View className="bg-surface-input rounded-2xl px-5 py-3.5">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#6B6B62"
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize="none"
          className="text-base text-ink"
        />
      </View>
    </View>
  );
}

export function EditProfileScreen() {
  const nav = useNavigation();
  const user = useUser();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setError('');
    setSaving(true);
    try {
      const trimmedName = name.trim() || user.name;
      const parts = trimmedName.split(' ');
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ') || ' ';
      await api.patch('/users/me', {
        firstName,
        lastName,
        email: email.trim() || user.email,
        phone: phone.trim() || user.phone,
      });
      user.setName(trimmedName);
      user.setEmail(email.trim() || user.email);
      user.setPhone(phone.trim() || user.phone);
      setSaved(true);
      setTimeout(() => nav.goBack(), 800);
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View className="flex-row items-center px-5 pt-4 pb-3">
          <Pressable onPress={() => nav.goBack()} hitSlop={10} className="mr-3">
            <ChevronLeft size={26} color="#1B1B16" />
          </Pressable>
          <Text className="text-xl font-bold text-ink flex-1 text-center">Edit Profile</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Field
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
          />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
          />
          <Field
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 (555) 000-0000"
            keyboardType="phone-pad"
          />

          {saved && (
            <View className="bg-green-100 rounded-2xl py-3 items-center mb-4">
              <Text className="text-base font-bold text-green-700">Profile updated!</Text>
            </View>
          )}
          {!!error && (
            <View className="bg-danger/10 border border-danger/30 rounded-2xl px-4 py-3 mb-4">
              <Text className="text-sm text-danger">{error}</Text>
            </View>
          )}
        </ScrollView>

        <View className="px-5 pb-6 pt-3">
          <GradientButton label="Save Changes" onPress={handleSave} disabled={saving} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
