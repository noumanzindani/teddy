import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { navigationRef } from './navigationRef';
import { listenForNotificationTaps } from '@utils/pushNotifications';

import { AuthNavigator } from './AuthNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainDrawerNavigator } from './MainDrawerNavigator';
import { ScreenListScreen } from '@features/dev/ScreenListScreen';

import {
  SalonProfileScreen, ServiceDetailScreen, FilterScreen,
  RescheduleTimeSlotScreen, RescheduleSuccessScreen, SelectTimeSlotScreen, StaffSelectionScreen, SalonIntakeScreen,
} from '@features/services/screens';
import {
  BookingPaymentScreen, BookingConfirmedScreen, BookingSummaryScreen,
  PaymentMethodsScreen, AddNewCardScreen, EditCardScreen, MyBookingsScreen,
  CancelReasonScreen, ServiceInvoiceScreen,
} from '@features/bookings/screens';
import { ChatThreadScreen } from '@features/chats/screens';
import {
  MoodJournalScreen, JournalScreen, JournalDetailsScreen, AddJournalScreen,
  NewGoalScreen, GoalDetailsScreen, AddReminderScreen, EditReminderScreen,
} from '@features/wellness/screens';
import { RewardsScreen, RewardDetailScreen, GiftCardsScreen, RateExperienceScreen, BeforeAfterViewerScreen } from '@features/rewards/screens';
import { NotificationsScreen, ChangePasswordScreen, EditProfileScreen, MedicalProfileScreen, MyProductsScreen, MyPreferencesScreen, MyRoutineScreen, MyFormsScreen, ShareScreen, FavoritesScreen, ReferFriendScreen } from '@features/profile/screens';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer ref={navigationRef} onReady={listenForNotificationTaps}>
      <Stack.Navigator
        initialRouteName="Auth"
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F5F4EC' } }}
      >
        <Stack.Screen name="ScreenList" component={ScreenListScreen} />
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        <Stack.Screen name="MainDrawer" component={MainDrawerNavigator} />

        <Stack.Screen name="SalonProfile" component={SalonProfileScreen} />
        <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
        <Stack.Screen name="Filter" component={FilterScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="SelectTimeSlot" component={SelectTimeSlotScreen} />
        <Stack.Screen name="StaffSelection" component={StaffSelectionScreen} />
        <Stack.Screen name="RescheduleTimeSlot" component={RescheduleTimeSlotScreen} />
        <Stack.Screen name="RescheduleSuccess" component={RescheduleSuccessScreen} options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="SalonIntake" component={SalonIntakeScreen} />

        <Stack.Screen name="BookingSummary" component={BookingSummaryScreen} />
        <Stack.Screen name="BookingPayment" component={BookingPaymentScreen} />
        <Stack.Screen name="BookingConfirmed" component={BookingConfirmedScreen} options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
        <Stack.Screen name="AddNewCard" component={AddNewCardScreen} />
        <Stack.Screen name="EditCard" component={EditCardScreen} />

        <Stack.Screen name="ChatThread" component={ChatThreadScreen} />

        <Stack.Screen name="MoodJournal" component={MoodJournalScreen} />
        <Stack.Screen name="Journal" component={JournalScreen} />
        <Stack.Screen name="JournalDetails" component={JournalDetailsScreen} />
        <Stack.Screen name="AddJournal" component={AddJournalScreen} />
        <Stack.Screen name="NewGoal" component={NewGoalScreen} />
        <Stack.Screen name="GoalDetails" component={GoalDetailsScreen} />
        <Stack.Screen name="AddReminder" component={AddReminderScreen} />
        <Stack.Screen name="EditReminder" component={EditReminderScreen} />

        <Stack.Screen name="Rewards" component={RewardsScreen} />
        <Stack.Screen name="RewardDetail" component={RewardDetailScreen} />
        <Stack.Screen name="GiftCards" component={GiftCardsScreen} />
        <Stack.Screen name="RateExperience" component={RateExperienceScreen} />

        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="MedicalProfile" component={MedicalProfileScreen} />
        <Stack.Screen name="MyProducts" component={MyProductsScreen} />
        <Stack.Screen name="MyPreferences" component={MyPreferencesScreen} />
        <Stack.Screen name="MyRoutine" component={MyRoutineScreen} />
        <Stack.Screen name="MyForms" component={MyFormsScreen} />
        <Stack.Screen name="Share" component={ShareScreen} options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="Favorites" component={FavoritesScreen} />
        <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
        <Stack.Screen name="ServiceInvoice" component={ServiceInvoiceScreen} />
        <Stack.Screen name="ReferFriend" component={ReferFriendScreen} />
        <Stack.Screen name="CancelReason" component={CancelReasonScreen} />
        <Stack.Screen
          name="BeforeAfterViewer"
          component={BeforeAfterViewerScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
