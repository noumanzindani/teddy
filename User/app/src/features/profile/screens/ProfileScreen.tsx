import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell, Menu, Sliders, CreditCard, BellRing, Lock, LifeBuoy,
  Award, Gift, Trash2, LogOut, Edit3, Camera, HeartPulse, Package, ClipboardList,
  Heart, Sparkles,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { Badge, ConfirmPopup } from '@components/primitives';
import { useUser, useAuth, useQuestionnaire } from '@store/index';
import { useImagePicker } from '@hooks/useImagePicker';
import { useState, useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { api } from '@utils/api';
import type { ReactNode } from 'react';

type Nav = DrawerNavigationProp<any> & { navigate: (s: string, p?: any) => void };

interface Item {
  icon: ReactNode;
  label: string;
  onPress?: () => void;
  danger?: boolean;
}

function MenuRow({ item, isLast }: { item: Item; isLast: boolean }) {
  return (
    <Pressable
      onPress={item.onPress}
      className={`flex-row items-center px-4 py-3.5 active:bg-sage-100 ${
        isLast ? '' : 'border-b border-sage-200'
      }`}
    >
      <View className="w-7 items-center">{item.icon}</View>
      <Text className={`ml-3 text-base ${item.danger ? 'text-danger' : 'text-ink'}`}>{item.label}</Text>
    </Pressable>
  );
}

export function ProfileScreen() {
  const nav = useNavigation<Nav>();
  const user = useUser();
  const auth = useAuth();
  const questionnaire = useQuestionnaire();
  const { pickFromGallery } = useImagePicker();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [uploading, setUploading] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    api.get<any>('/users/me')
      .then((data) => user.setFromApi(data))
      .catch(() => { /* silently ignore — store already has data from login */ });
  }, []);

  const onChangeAvatar = async () => {
    const uri = await pickFromGallery();
    if (!uri) return;
    user.setAvatar(uri);
    setUploading(true);
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 1200, useNativeDriver: false }).start(() =>
      setUploading(false)
    );
  };

  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const items: Item[] = [
    { icon: <Sliders size={18} color="#1B1B16" />, label: 'Edit Preference', onPress: () => nav.navigate('Onboarding', { screen: 'Personalize' }) },
    { icon: <HeartPulse size={18} color="#1B1B16" />, label: 'Medical & Allergy Info', onPress: () => nav.navigate('MedicalProfile') },
    { icon: <Heart size={18} color="#1B1B16" />, label: 'My Preferences', onPress: () => nav.navigate('MyPreferences') },
    { icon: <Sparkles size={18} color="#1B1B16" />, label: 'My Skincare Routine', onPress: () => nav.navigate('MyRoutine') },
    { icon: <Package size={18} color="#1B1B16" />, label: 'My Products', onPress: () => nav.navigate('MyProducts') },
    { icon: <ClipboardList size={18} color="#1B1B16" />, label: 'My Forms', onPress: () => nav.navigate('MyForms') },
    { icon: <CreditCard size={18} color="#1B1B16" />, label: 'Payment Methods', onPress: () => nav.navigate('PaymentMethods') },
    { icon: <BellRing size={18} color="#1B1B16" />, label: 'Notifications', onPress: () => nav.navigate('Notifications') },
    { icon: <Lock size={18} color="#1B1B16" />, label: 'Change Password', onPress: () => nav.navigate('ChangePassword') },
    { icon: <LifeBuoy size={18} color="#1B1B16" />, label: 'Support & Help' },
    { icon: <Award size={18} color="#1B1B16" />, label: 'Loyalty & Rewards', onPress: () => nav.navigate('Rewards') },
    { icon: <Gift size={18} color="#1B1B16" />, label: 'Refer a Friend', onPress: () => nav.navigate('ReferFriend') },
    { icon: <Trash2 size={18} color="#1B1B16" />, label: 'Delete My Account', onPress: () => setConfirmDelete(true) },
    { icon: <LogOut size={18} color="#1B1B16" />, label: 'Logout', onPress: () => setConfirmLogout(true) },
  ];

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
          <View className="flex-row items-center">
            <Pressable onPress={() => nav.openDrawer?.()} hitSlop={10} className="mr-3">
              <Menu size={24} color="#1B1B16" />
            </Pressable>
            <Text className="text-2xl font-bold text-ink">Profile</Text>
            <View className="ml-3">
              <Badge label={`${user.points.toLocaleString()} PTS`} tone="gold" />
            </View>
          </View>
          <Pressable onPress={() => nav.navigate('Notifications')} hitSlop={10}>
            <Bell size={22} color="#1B1B16" />
          </Pressable>
        </View>

        <View className="px-5 pt-2 pb-6">
          <View className="flex-row items-start">
            <Pressable onPress={onChangeAvatar} className="relative active:opacity-80">
              <Image source={{ uri: user.avatarUri }} style={{ width: 80, height: 80, borderRadius: 40 }} />
              <View className="absolute bottom-0 left-1 bg-white rounded-full w-7 h-7 items-center justify-center">
                <Camera size={14} color="#1B1B16" />
              </View>
            </Pressable>
            <View className="flex-1 ml-4 mt-2">
              <View className="flex-row items-center">
                <Text className="text-xl font-bold text-ink mr-2">{user.name}</Text>
                <Badge label="Pro" tone="sage" />
              </View>
              <Text className="text-sm text-ink-muted mt-0.5">{user.email}</Text>
              {uploading && (
                <View className="mt-2 h-1 bg-sage-200 rounded-full overflow-hidden w-32">
                  <Animated.View className="h-full bg-sage-700 rounded-full" style={{ width: barWidth }} />
                </View>
              )}
            </View>
            <Pressable hitSlop={10} className="mt-2" onPress={() => nav.navigate('EditProfile')}>
              <Edit3 size={18} color="#1B1B16" />
            </Pressable>
          </View>
        </View>

        <View className="mx-5 bg-surface-raised rounded-2xl">
          {items.map((item, i) => (
            <MenuRow key={item.label} item={item} isLast={i === items.length - 1} />
          ))}
        </View>
      </ScrollView>

      <ConfirmPopup
        visible={confirmDelete}
        title="Delete Your Account?"
        body="This action is permanent and cannot be undone. All your data, including bookings, goals, and history, will be deleted."
        confirmLabel="Cancel"
        cancelLabel="Confirm"
        onConfirm={() => setConfirmDelete(false)}
        onCancel={() => {
          setConfirmDelete(false);
          auth.clearToken();
          questionnaire.reset();
          (nav as any).reset({ index: 0, routes: [{ name: 'Auth' }] });
        }}
      />
      <ConfirmPopup
        visible={confirmLogout}
        title="Log out?"
        body="You'll need to sign in again to use the app."
        confirmLabel="Stay"
        cancelLabel="Logout"
        onConfirm={() => setConfirmLogout(false)}
        onCancel={() => {
          setConfirmLogout(false);
          useAuth.getState().clearToken();
          useUser.getState().reset();
          nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Auth' as never }] }));
        }}
      />
    </SafeAreaView>
  );
}
