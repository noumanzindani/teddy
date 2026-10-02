import { View } from 'react-native';
import { useEffect } from 'react';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TeddyLogo } from '@components/primitives';
import type { AuthStackParamList } from '@navigation/types';
import { useAuth } from '@store/index';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Splash'>;

export function SplashScreen() {
  const nav = useNavigation<Nav>();
  const token = useAuth((s) => s.token);

  useEffect(() => {
    const t = setTimeout(() => {
      if (token) {
        // Existing session — go straight to app
        (nav as any).dispatch(
          CommonActions.reset({ index: 0, routes: [{ name: 'MainDrawer' }] })
        );
      } else {
        nav.replace('OnboardingCarousel');
      }
    }, 1800);
    return () => clearTimeout(t);
  }, [nav, token]);

  return (
    <SafeAreaView className="flex-1 bg-sage-600" edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center">
        <TeddyLogo variant="light" size="lg" />
      </View>
    </SafeAreaView>
  );
}
