import './global.css';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { RootNavigator } from '@navigation/RootNavigator';
import { useAuth } from '@store/index';
import { registerForPushNotifications } from '@utils/pushNotifications';

export default function App() {
  // Register this device for pushes whenever a user is signed in
  // (fresh login, sign-up, or a session restored from storage).
  const token = useAuth((s) => s.token);
  useEffect(() => {
    if (token) registerForPushNotifications();
  }, [token]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
