import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const PROJECT_ID =
  Constants.easConfig?.projectId ??
  (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
  '4a4a3316-a896-4f42-bc76-ca4b833e5909';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

export interface NotifPrefs {
  medium: boolean;
  low: boolean;
}

export async function getNotifPrefs(): Promise<NotifPrefs> {
  const [m, l] = await Promise.all([
    SecureStore.getItemAsync('notif_medium'),
    SecureStore.getItemAsync('notif_low'),
  ]);
  return {
    medium: m !== 'false',
    low: l !== 'false',
  };
}

export async function saveNotifPrefs(prefs: NotifPrefs): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync('notif_medium', String(prefs.medium)),
    SecureStore.setItemAsync('notif_low', String(prefs.low)),
  ]);
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Push] skipped — not a physical device');
    return null;
  }

  if (isExpoGo) {
    console.log('[Push] skipped — Expo Go removed remote push support in SDK 53. Use a dev build.');
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  const finalStatus =
    existing === 'granted'
      ? existing
      : (await Notifications.requestPermissionsAsync()).status;

  if (finalStatus !== 'granted') {
    console.log('[Push] permission denied:', finalStatus);
    return null;
  }

  try {
    console.log('[Push] requesting token with projectId:', PROJECT_ID);
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    console.log('[Push] token received:', data);
    return data;
  } catch (err) {
    console.error('[Push] getExpoPushTokenAsync failed:', err);
    return null;
  }
}
