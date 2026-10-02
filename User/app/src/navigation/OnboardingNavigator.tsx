import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from './types';
import {
  PersonalizeScreen, SkinProfileScreen, ProductPreferencesScreen,
  AllergiesScreen, SalonPreferencesScreen, ProfilePhotoScreen,
} from '@features/onboarding/screens';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Personalize" component={PersonalizeScreen} />
      <Stack.Screen name="SkinProfile" component={SkinProfileScreen} />
      <Stack.Screen name="ProductPreferences" component={ProductPreferencesScreen} />
      <Stack.Screen name="Allergies" component={AllergiesScreen} />
      <Stack.Screen name="SalonPreferences" component={SalonPreferencesScreen} />
      <Stack.Screen name="ProfilePhoto" component={ProfilePhotoScreen} />
    </Stack.Navigator>
  );
}
