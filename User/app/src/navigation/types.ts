import type { NavigatorScreenParams } from '@react-navigation/native';

export interface IntakeParams {
  skinType: string;
  allergens: string[];
  products: string[];
  goals: string;
  notes: string;
}

export interface AddOnParam { id: string; name: string; price: number; durationMin: number; }

export type AuthStackParamList = {
  Splash: undefined;
  OnboardingCarousel: undefined;
  SignUp: undefined;
  Login: undefined;
  OtpVerification: { phone?: string };
  ForgotPasswordEmail: undefined;
  ForgotPasswordCheck: undefined;
  SetNewPassword: undefined;
};

export type OnboardingStackParamList = {
  Personalize: undefined;
  SkinProfile: undefined;
  ProductPreferences: undefined;
  Allergies: undefined;
  SalonPreferences: undefined;
  ProfilePhoto: undefined;
};

export type TabParamList = {
  HomeTab: undefined;
  ServicesTab: undefined;
  ChatsTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  MainDrawer: NavigatorScreenParams<{ Tabs: NavigatorScreenParams<TabParamList> }>;

  // Modal / detail screens reachable from anywhere
  ScreenList: undefined;

  // Services
  SalonProfile: { salonId: string };
  ServiceDetail: { serviceId: string; vendorId?: string };
  Filter: undefined;
  RescheduleTimeSlot: { bookingId?: string };
  RescheduleSuccess: undefined;
  SelectTimeSlot: { serviceId: string; vendorId?: string };
  StaffSelection: { serviceId: string; date: string; time: string; vendorId?: string };
  SalonIntake: { serviceId: string; date: string; time: string; vendorId?: string };

  // Bookings
  BookingSummary: { serviceId: string; date: string; time: string; intake?: IntakeParams; addOns?: AddOnParam[] };
  BookingPayment: { serviceId: string; date?: string; time?: string; vendorId?: string; intake?: IntakeParams; addOns?: AddOnParam[] };
  BookingConfirmed: undefined;
  ServiceInvoice: { bookingId: string };
  AddNewCard: undefined;
  EditCard: { cardId: string };
  PaymentMethods: undefined;

  // Chats
  ChatThread: { threadId: string };

  // Wellness
  MoodJournal: undefined;
  Journal: undefined;
  JournalDetails: { entryId: string };
  AddJournal: undefined;
  NewGoal: undefined;
  GoalDetails: { goalId: string };
  AddReminder: undefined;
  EditReminder: { reminderId: string };

  // Rewards
  Rewards: undefined;
  RewardDetail: { rewardId: string };
  GiftCards: undefined;
  RateExperience: { bookingId: string };

  // Profile
  Notifications: undefined;
  ChangePassword: undefined;
  EditProfile: undefined;
  MedicalProfile: undefined;
  MyProducts: undefined;
  MyPreferences: undefined;
  MyRoutine: undefined;
  MyForms: undefined;
  Share: undefined;
  Favorites: undefined;
  MyBookings: undefined;
  ReferFriend: undefined;
  CancelReason: { bookingId?: string };
  BeforeAfterViewer: { bookingId?: string };
};
