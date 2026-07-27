import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { extractAlertId, NotificationDeduper } from './notificationDedup';

const PROJECT_ID =
  Constants.easConfig?.projectId ??
  (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
  '4a4a3316-a896-4f42-bc76-ca4b833e5909';

const isExpoGo = Constants.executionEnvironment === 'storeClient';
const receivedNotificationDeduper = new NotificationDeduper();
const responseNotificationDeduper = new NotificationDeduper();

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
    if (__DEV__) console.info('[Push] Registration requires a physical device.');
    return null;
  }

  if (isExpoGo) {
    if (__DEV__) {
      console.info('[Push] Remote push registration requires a development build.');
    }
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  const finalStatus =
    existing === 'granted'
      ? existing
      : (await Notifications.requestPermissionsAsync()).status;

  if (finalStatus !== 'granted') {
    if (__DEV__) console.info('[Push] Notification permission was not granted.');
    return null;
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    if (__DEV__) console.info('[Push] Notification registration succeeded.');
    return data;
  } catch {
    if (__DEV__) console.warn('[Push] Notification registration failed.');
    return null;
  }
}

export function shouldPresentNotification(
  data: Record<string, unknown> | null | undefined,
  now = Date.now()
): boolean {
  return receivedNotificationDeduper.shouldHandle(extractAlertId(data), now);
}

export function shouldHandleNotificationResponse(
  data: Record<string, unknown> | null | undefined,
  now = Date.now()
): boolean {
  return responseNotificationDeduper.shouldHandle(extractAlertId(data), now);
}

export function getNotificationAlertId(
  data: Record<string, unknown> | null | undefined
): string | null {
  return extractAlertId(data);
}
