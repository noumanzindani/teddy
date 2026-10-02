import { ScrollView, Text, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SECTIONS: { title: string; routes: { name: keyof RootStackParamList; label: string; params?: any }[] }[] = [
  {
    title: 'Auth & Onboarding',
    routes: [
      { name: 'Auth', label: 'Splash', params: { screen: 'Splash' } },
      { name: 'Auth', label: 'Onboarding Carousel', params: { screen: 'OnboardingCarousel' } },
      { name: 'Auth', label: 'Sign Up', params: { screen: 'SignUp' } },
      { name: 'Auth', label: 'Login', params: { screen: 'Login' } },
      { name: 'Auth', label: 'OTP Verification', params: { screen: 'OtpVerification' } },
      { name: 'Auth', label: 'Forgot Password — Email', params: { screen: 'ForgotPasswordEmail' } },
      { name: 'Auth', label: 'Forgot Password — Check Email', params: { screen: 'ForgotPasswordCheck' } },
      { name: 'Auth', label: 'Set New Password', params: { screen: 'SetNewPassword' } },
      { name: 'Onboarding', label: "Let's Personalize", params: { screen: 'Personalize' } },
      { name: 'Onboarding', label: 'Skin Profile', params: { screen: 'SkinProfile' } },
      { name: 'Onboarding', label: 'Product Preferences', params: { screen: 'ProductPreferences' } },
      { name: 'Onboarding', label: 'Allergies & Sensitivities', params: { screen: 'Allergies' } },
      { name: 'Onboarding', label: 'Salon Preferences', params: { screen: 'SalonPreferences' } },
      { name: 'Onboarding', label: 'Profile Photo', params: { screen: 'ProfilePhoto' } },
    ],
  },
  {
    title: 'Main App (Tabs + Drawer)',
    routes: [
      { name: 'MainDrawer', label: 'Home', params: { screen: 'Tabs', params: { screen: 'HomeTab' } } },
      { name: 'MainDrawer', label: 'Services', params: { screen: 'Tabs', params: { screen: 'ServicesTab' } } },
      { name: 'MainDrawer', label: 'Chats', params: { screen: 'Tabs', params: { screen: 'ChatsTab' } } },
      { name: 'MainDrawer', label: 'Profile', params: { screen: 'Tabs', params: { screen: 'ProfileTab' } } },
    ],
  },
  {
    title: 'Services / Booking',
    routes: [
      { name: 'SalonProfile', label: 'Salon Profile', params: { salonId: 's1' } },
      { name: 'ServiceDetail', label: 'Service Detail', params: { serviceId: 'sv1' } },
      { name: 'Filter', label: 'Filter' },
      { name: 'RescheduleTimeSlot', label: 'Reschedule Time Slot' },
      { name: 'BookingPayment', label: 'Booking Payment', params: { serviceId: 'sv1' } },
      { name: 'PaymentMethods', label: 'Payment Methods' },
      { name: 'AddNewCard', label: 'Add New Card' },
      { name: 'EditCard', label: 'Edit Card', params: { cardId: 'c1' } },
    ],
  },
  {
    title: 'Chats',
    routes: [
      { name: 'ChatThread', label: 'Chat Thread', params: { threadId: 't1' } },
    ],
  },
  {
    title: 'Wellness',
    routes: [
      { name: 'MoodJournal', label: 'My Mood Journal' },
      { name: 'Journal', label: 'Journal' },
      { name: 'JournalDetails', label: 'Journal Details', params: { entryId: 'j1' } },
      { name: 'AddJournal', label: 'Add Journal' },
      { name: 'NewGoal', label: 'New Goal' },
      { name: 'GoalDetails', label: 'Goal Details', params: { goalId: 'g1' } },
      { name: 'AddReminder', label: 'Add Reminder' },
      { name: 'EditReminder', label: 'Edit Reminder', params: { reminderId: 'r1' } },
    ],
  },
  {
    title: 'Rewards & Engagement',
    routes: [
      { name: 'Rewards', label: 'Rewards' },
      { name: 'RewardDetail', label: 'Reward Detail', params: { rewardId: 'rw1' } },
      { name: 'GiftCards', label: 'Gift Cards' },
      { name: 'RateExperience', label: 'Rate Your Experience', params: { bookingId: 'b1' } },
    ],
  },
  {
    title: 'Profile / Settings',
    routes: [
      { name: 'Notifications', label: 'Notifications' },
      { name: 'ChangePassword', label: 'Change Password' },
      { name: 'Share', label: 'Share' },
    ],
  },
];

export function ScreenListScreen() {
  const nav = useNavigation<Nav>();
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-5 py-3 border-b border-sage-200">
        <Text className="text-2xl font-bold text-ink">TEDDY · Dev Index</Text>
        <Text className="text-sm text-ink-muted mt-1">Tap any screen to preview it.</Text>
      </View>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        {SECTIONS.map((section) => (
          <View key={section.title} className="mt-5">
            <Text className="px-5 text-xs font-semibold uppercase tracking-wider text-ink-muted">{section.title}</Text>
            <View className="mt-2 mx-5 bg-surface-card rounded-xl overflow-hidden">
              {section.routes.map((r, i) => (
                <Pressable
                  key={`${r.name}-${i}`}
                  onPress={() => (nav as any).navigate(r.name, r.params)}
                  className={`px-4 py-3.5 active:bg-sage-50 ${i !== section.routes.length - 1 ? 'border-b border-sage-100' : ''}`}
                >
                  <Text className="text-base text-ink">{r.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
