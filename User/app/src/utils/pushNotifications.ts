/**
 * TEDDY User App — push notifications
 *
 * Gets this device's Expo push token and registers it with the API
 * (POST /users/me/push-token). The API sends pushes through Expo's push service
 * (see api/src/services/notification.service.ts), attaching the notification's
 * `deepLink` in the payload so a tap can open the matching screen.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useAuth } from '@store/index';
import { api } from './api';
import { navigationRef } from '../navigation/navigationRef';
import type { RootStackParamList } from '../navigation/types';

// Show pushes as banners even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Ask for permission, fetch the Expo push token and send it to the API.
 * Safe to call on every login / app start — the API de-duplicates tokens.
 * Never throws: push is optional, so failures (simulator, permission denied,
 * Expo Go on Android) are logged and ignored.
 */
export async function registerForPushNotifications(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#7E8A6E',
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.post('/users/me/push-token', { token });
  } catch (err) {
    console.warn('[push] registration skipped:', (err as Error).message);
  }
}

type Target = { [K in keyof RootStackParamList]: { name: K; params: RootStackParamList[K] } }[keyof RootStackParamList];

/**
 * Map an API deepLink (e.g. "/bookings/abc", "/chat/123", "/routine") to an
 * app screen. Deep links the API currently sends:
 *   /bookings, /bookings/:bookingId, /chat/:threadId, /routine
 */
function routeForDeepLink(deepLink: string | undefined): Target {
  // TODO(you): map each deepLink shape above to a screen from RootStackParamList.
  return { name: 'Notifications', params: undefined };
}

function openFromNotification(response: Notifications.NotificationResponse) {
  // Signed-out users can't open booking/chat screens — let them log in first.
  if (!navigationRef.isReady() || !useAuth.getState().token) return;
  const deepLink = response.notification.request.content.data?.deepLink as string | undefined;
  const target = routeForDeepLink(deepLink);
  // Cast: TS can't correlate name/params across the union for navigate().
  (navigationRef.navigate as (name: string, params?: object) => void)(target.name, target.params);
}

/**
 * Handle taps on pushes — both while the app is running and the tap that
 * launched it from a killed state. Returns an unsubscribe function.
 */
export function listenForNotificationTaps(): () => void {
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) openFromNotification(response);
  });
  const sub = Notifications.addNotificationResponseReceivedListener(openFromNotification);
  return () => sub.remove();
}
