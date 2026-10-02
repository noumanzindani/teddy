import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';
import {
  SplashScreen, OnboardingCarouselScreen, SignUpScreen, LoginScreen,
  OtpVerificationScreen, ForgotPasswordEmailScreen, ForgotPasswordCheckScreen,
  SetNewPasswordScreen,
} from '@features/auth/screens';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="OnboardingCarousel" component={OnboardingCarouselScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      <Stack.Screen name="ForgotPasswordEmail" component={ForgotPasswordEmailScreen} />
      <Stack.Screen
        name="ForgotPasswordCheck"
        component={ForgotPasswordCheckScreen}
        options={{ presentation: 'transparentModal', animation: 'fade' }}
      />
      <Stack.Screen name="SetNewPassword" component={SetNewPasswordScreen} />
    </Stack.Navigator>
  );
}
