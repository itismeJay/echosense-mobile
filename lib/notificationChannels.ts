import type { SafeNotificationData } from './notificationPayload';

export const ANDROID_PHASE3_ALERT_CHANNEL_ID =
  'echosense-phase3-alerts';
export const ANDROID_HIGH_ALERT_CHANNEL_ID = 'echosense-high-alerts';
export const ANDROID_PROVIDER_TEST_CHANNEL_ID = 'echosense-alerts';

export const ANDROID_NOTIFICATION_CHANNELS = [
  {
    id: ANDROID_PHASE3_ALERT_CHANNEL_ID,
    name: 'EchoSense classroom alerts',
    description:
      'LOW and MEDIUM unverified alerts requiring human review.',
    importance: 'default',
    sound: 'default',
    enableVibrate: true,
    vibrationPattern: [0, 250, 150, 250],
    lockscreenVisibility: 'private',
  },
  {
    id: ANDROID_HIGH_ALERT_CHANNEL_ID,
    name: 'EchoSense high-priority alerts',
    description:
      'HIGH unverified alerts requiring prompt human review.',
    importance: 'high',
    sound: 'default',
    enableVibrate: true,
    vibrationPattern: [0, 300, 150, 450],
    lockscreenVisibility: 'private',
  },
  {
    id: ANDROID_PROVIDER_TEST_CHANNEL_ID,
    name: 'EchoSense delivery tests',
    description:
      'Audible provider delivery tests that do not represent classroom alerts.',
    importance: 'default',
    sound: 'default',
    enableVibrate: true,
    vibrationPattern: [0, 200, 150, 200],
    lockscreenVisibility: 'private',
  },
] as const;

export type AndroidNotificationChannelId =
  | typeof ANDROID_PHASE3_ALERT_CHANNEL_ID
  | typeof ANDROID_HIGH_ALERT_CHANNEL_ID
  | typeof ANDROID_PROVIDER_TEST_CHANNEL_ID;

export function getAndroidNotificationChannelId(
  data: SafeNotificationData
): AndroidNotificationChannelId {
  if (data.type === 'provider_test') {
    return ANDROID_PROVIDER_TEST_CHANNEL_ID;
  }
  return data.severity === 'high'
    ? ANDROID_HIGH_ALERT_CHANNEL_ID
    : ANDROID_PHASE3_ALERT_CHANNEL_ID;
}
