import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { extractAlertId, NotificationDeduper } from './notificationDedup';
import {
  getNotificationIdentity,
  parseNotificationData,
  parseNotificationEnvelope,
} from './notificationPayload';
import {
  createLegacyAlertIntent,
  parseStoredNotificationIntent,
  type PendingNotificationIntent,
} from './notificationNavigation';
import { API_HOST } from './constants';
import { ANDROID_NOTIFICATION_CHANNELS } from './notificationChannels';
import { clearPushToken, postPushToken } from './api';
import {
  runPushRegistration,
  type PushRegistrationResult,
  type StoredPushRegistration,
} from './pushRegistration';
import {
  getExpoNotifications,
  ensureAndroidNotificationChannels,
  isExpoGo,
} from './notificationRuntime';

const PROJECT_ID =
  Constants.easConfig?.projectId ??
  (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
  '4a4a3316-a896-4f42-bc76-ca4b833e5909';

const receivedNotificationDeduper = new NotificationDeduper();
const responseNotificationDeduper = new NotificationDeduper();
const PUSH_REGISTRATION_KEY = 'push_registration_v1';
const LEGACY_PUSH_TOKEN_KEY = 'push_token';
const PENDING_ALERT_KEY = 'pending_notification_alert_id';
const PENDING_NOTIFICATION_INTENT_KEY = 'pending_notification_intent_v2';
let pushLifecycleGeneration = 0;
let pushRegistrationInFlight: {
  userId: string | null;
  promise: Promise<PushRegistrationResult>;
} | null = null;
let lastPushRegistrationStatus: PushRegistrationStatus = 'not-attempted';
const pushStatusListeners = new Set<(status: PushRegistrationStatus) => void>();

export type PushRegistrationStatus =
  | PushRegistrationResult['status']
  | 'not-attempted';

export interface PushDiagnostics {
  physicalDevice: boolean;
  supportedBuild: boolean;
  permissionStatus: string;
  iosSoundPermission: 'allowed' | 'not-allowed' | 'unavailable';
  expoTokenRegistered: boolean | null;
  lastRegistrationStatus: PushRegistrationStatus;
  expectedAndroidChannels: string[];
  apiHost: string;
  cleanReinstallMayBeNeeded: boolean;
}

function publishPushRegistrationStatus(status: PushRegistrationStatus): void {
  lastPushRegistrationStatus = status;
  for (const listener of pushStatusListeners) listener(status);
}

export function subscribeToPushRegistrationStatus(
  listener: (status: PushRegistrationStatus) => void
): () => void {
  pushStatusListeners.add(listener);
  listener(lastPushRegistrationStatus);
  return () => pushStatusListeners.delete(listener);
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
  if (
    pushRegistrationInFlight &&
    pushRegistrationInFlight.userId === userId
  ) {
    return pushRegistrationInFlight.promise;
  }

  const promise = performPushRegistration(userId).finally(() => {
    if (pushRegistrationInFlight?.promise === promise) {
      pushRegistrationInFlight = null;
    }
  });
  pushRegistrationInFlight = { userId, promise };
  return promise;
}

async function performPushRegistration(
  userId: string | null
): Promise<PushRegistrationResult> {
  const registrationGeneration = pushLifecycleGeneration;
  if (
    userId &&
    Device.isDevice &&
    !isExpoGo &&
    !(await ensureAndroidNotificationChannels())
  ) {
    const result: PushRegistrationResult = {
      status: 'channel-setup-failed',
    };
    publishPushRegistrationStatus(result.status);
    return result;
  }
  const getNotifications = async () => {
    const notifications = await getExpoNotifications();
    if (!notifications) {
      throw new Error('Notifications require a development build');
    }
    return notifications;
  };
  const result = await runPushRegistration({
    userId,
    isPhysicalDevice: Device.isDevice,
    isSupportedBuild: !isExpoGo,
    getPermissionStatus: async () =>
      (await (await getNotifications()).getPermissionsAsync()).status,
    requestPermission: async () =>
      (await (await getNotifications()).requestPermissionsAsync()).status,
    getPushToken: async () =>
      (
        await (
          await getNotifications()
        ).getExpoPushTokenAsync({ projectId: PROJECT_ID })
      ).data,
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
  publishPushRegistrationStatus(result.status);
  return result;
}

export async function getPushDiagnostics(
  userId: string | null
): Promise<PushDiagnostics> {
  const notifications = await getExpoNotifications();
  let permissionStatus = 'unavailable';
  let iosSoundPermission: PushDiagnostics['iosSoundPermission'] =
    'unavailable';
  if (notifications) {
    try {
      const permission = await notifications.getPermissionsAsync();
      permissionStatus = permission.status;
      if (Platform.OS === 'ios') {
        iosSoundPermission = permission.ios?.allowsSound
          ? 'allowed'
          : 'not-allowed';
      }
    } catch {
      permissionStatus = 'unavailable';
    }
  }

  let expoTokenRegistered: boolean | null = null;
  try {
    const stored = await getStoredPushRegistration();
    expoTokenRegistered = Boolean(
      userId && stored?.userId === userId && isExpoPushTokenSafe(stored.token)
    );
  } catch {
    expoTokenRegistered = null;
  }

  return {
    physicalDevice: Device.isDevice,
    supportedBuild: !isExpoGo && Boolean(notifications),
    permissionStatus,
    iosSoundPermission,
    expoTokenRegistered,
    lastRegistrationStatus: lastPushRegistrationStatus,
    expectedAndroidChannels: ANDROID_NOTIFICATION_CHANNELS.map(
      (channel) => channel.id
    ),
    apiHost: API_HOST,
    cleanReinstallMayBeNeeded: Platform.OS === 'android',
  };
}

function isExpoPushTokenSafe(token: string): boolean {
  return /^(?:Expo|Exponent)PushToken\[[^\]\s]+\]$/.test(token);
}

export async function clearPushRegistration(): Promise<void> {
  pushLifecycleGeneration += 1;
  await clearPushToken();
  await Promise.all([
    SecureStore.deleteItemAsync(PUSH_REGISTRATION_KEY),
    SecureStore.deleteItemAsync(LEGACY_PUSH_TOKEN_KEY),
    SecureStore.deleteItemAsync(PENDING_ALERT_KEY),
    SecureStore.deleteItemAsync(PENDING_NOTIFICATION_INTENT_KEY),
  ]);
  receivedNotificationDeduper.clear();
  responseNotificationDeduper.clear();
  publishPushRegistrationStatus('not-authenticated');
}

export async function storePendingNotificationIntent(
  intent: PendingNotificationIntent
): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(
      PENDING_NOTIFICATION_INTENT_KEY,
      JSON.stringify(intent)
    ),
    SecureStore.deleteItemAsync(PENDING_ALERT_KEY),
  ]);
}

export async function getPendingNotificationIntent(): Promise<PendingNotificationIntent | null> {
  let raw: string | null;
  try {
    raw = await SecureStore.getItemAsync(PENDING_NOTIFICATION_INTENT_KEY);
  } catch {
    return null;
  }
  if (raw) {
    try {
      const parsed = parseStoredNotificationIntent(JSON.parse(raw));
      if (parsed) return parsed;
    } catch {
      // Invalid stored navigation state is removed below.
    }
    await SecureStore.deleteItemAsync(PENDING_NOTIFICATION_INTENT_KEY).catch(
      () => {}
    );
  }

  // Migrate an alert target stored by an earlier app version without ever
  // interpreting it as a provider-test route.
  let legacyValue: string | null;
  try {
    legacyValue = await SecureStore.getItemAsync(PENDING_ALERT_KEY);
  } catch {
    return null;
  }
  const legacyAlertId = extractAlertId({ alertId: legacyValue });
  return legacyAlertId
    ? createLegacyAlertIntent(
        Number(legacyAlertId),
        new Date().toISOString()
      )
    : null;
}

export async function clearPendingNotificationIntent(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(PENDING_NOTIFICATION_INTENT_KEY),
    SecureStore.deleteItemAsync(PENDING_ALERT_KEY),
  ]);
}

export function shouldPresentNotification(
  data: Record<string, unknown> | null | undefined,
  title: unknown,
  body: unknown,
  now = Date.now()
): boolean {
  const parsed = parseNotificationEnvelope(data, title, body);
  return parsed
    ? receivedNotificationDeduper.shouldHandle(
        getNotificationIdentity(parsed),
        now
      )
    : false;
}

export function shouldHandleNotificationResponse(
  data: Record<string, unknown> | null | undefined,
  title: unknown,
  body: unknown,
  now = Date.now()
): boolean {
  const parsed = parseNotificationEnvelope(data, title, body);
  return parsed
    ? responseNotificationDeduper.shouldHandle(
        getNotificationIdentity(parsed),
        now
      )
    : false;
}

export function getNotificationAlertId(
  data: Record<string, unknown> | null | undefined
): string | null {
  const parsed = parseNotificationData(data);
  return parsed?.type === 'classroom_alert' ? String(parsed.alertId) : null;
}
