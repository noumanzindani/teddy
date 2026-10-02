import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Reset the whole navigation tree back to the Auth flow. Called when the API
 * reports the session has expired (401), so the user lands on the login screen
 * instead of staring at a silently-empty screen.
 */
export function resetToAuth() {
  if (!navigationRef.isReady()) return;
  const root = navigationRef.getRootState();
  const topRoute = root?.routes?.[root.index ?? 0]?.name;
  if (topRoute === 'Auth') return; // already in the auth flow
  navigationRef.dispatch(
    CommonActions.reset({ index: 0, routes: [{ name: 'Auth' }] }),
  );
}
