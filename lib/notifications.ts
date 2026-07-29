import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { extractAlertId, NotificationDeduper } from './notificationDedup';
import { clearPushToken, postPushToken } from './api';
import {
  runPushRegistration,
  type PushRegistrationResult,
  type StoredPushRegistration,
} from './pushRegistration';

const PROJECT_ID =
  Constants.easConfig?.projectId ??
  (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
  '4a4a3316-a896-4f42-bc76-ca4b833e5909';

const isExpoGo = Constants.executionEnvironment === 'storeClient';
const receivedNotificationDeduper = new NotificationDeduper();
const responseNotificationDeduper = new NotificationDeduper();
const PUSH_REGISTRATION_KEY = 'push_registration_v1';
const LEGACY_PUSH_TOKEN_KEY = 'push_token';
const PENDING_ALERT_KEY = 'pending_notification_alert_id';
let pushLifecycleGeneration = 0;

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

async function getStoredPushRegistration(): Promise<StoredPushRegistration | null> {
  const raw = await SecureStore.getItemAsync(PUSH_REGISTRATION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredPushRegistration>;
    return typeof parsed.userId === 'string' && typeof parsed.token === 'string'
      ? { userId: parsed.userId, token: parsed.token }
      : null;
  } catch {
    return null;
  }
}

export async function syncPushRegistration(
  userId: string | null
): Promise<PushRegistrationResult> {
  const registrationGeneration = pushLifecycleGeneration;
  const result = await runPushRegistration({
    userId,
    isPhysicalDevice: Device.isDevice,
    isSupportedBuild: !isExpoGo,
    getPermissionStatus: async () =>
      (await Notifications.getPermissionsAsync()).status,
    requestPermission: async () =>
      (await Notifications.requestPermissionsAsync()).status,
    getPushToken: async () =>
      (await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID })).data,
    getStoredRegistration: getStoredPushRegistration,
    registerToken: async (token) => {
      if (registrationGeneration !== pushLifecycleGeneration) {
        throw new Error('Push registration was cancelled');
      }
      await postPushToken(token);
      if (registrationGeneration !== pushLifecycleGeneration) {
        // A sign-out raced the request. Ensure the final backend state is
        // detached before reporting the registration as failed.
        await clearPushToken();
        throw new Error('Push registration was cancelled');
      }
    },
    storeRegistration: async (registration) => {
      await SecureStore.setItemAsync(
        PUSH_REGISTRATION_KEY,
        JSON.stringify(registration)
      );
      await SecureStore.deleteItemAsync(LEGACY_PUSH_TOKEN_KEY);
    },
  });

  if (__DEV__) {
    const successful =
      result.status === 'registered' ||
      result.status === 'already-registered';
    console.info(
      successful
        ? '[Push] Registration is ready.'
        : `[Push] Registration unavailable: ${result.status}.`
    );
  }
  return result;
}

export async function clearPushRegistration(): Promise<void> {
  pushLifecycleGeneration += 1;
  await clearPushToken();
  await Promise.all([
    SecureStore.deleteItemAsync(PUSH_REGISTRATION_KEY),
    SecureStore.deleteItemAsync(LEGACY_PUSH_TOKEN_KEY),
  ]);
}

export async function storePendingAlertId(alertId: string): Promise<void> {
  await SecureStore.setItemAsync(PENDING_ALERT_KEY, alertId);
}

export async function getPendingAlertId(): Promise<string | null> {
  const alertId = await SecureStore.getItemAsync(PENDING_ALERT_KEY);
  return extractAlertId({ alertId });
}

export async function clearPendingAlertId(): Promise<void> {
  await SecureStore.deleteItemAsync(PENDING_ALERT_KEY);
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
