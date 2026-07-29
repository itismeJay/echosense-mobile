export const ANDROID_ALERT_CHANNEL_ID = 'echosense-alerts';
export const ANDROID_HIGH_ALERT_CHANNEL_ID = 'echosense-high-alerts';

export const ANDROID_NOTIFICATION_CHANNELS = [
  {
    id: ANDROID_ALERT_CHANNEL_ID,
    name: 'EchoSense classroom alerts',
    description:
      'Normal-priority unverified classroom alerts requiring human review.',
    importance: 'default',
    sound: null,
    enableVibrate: false,
  },
  {
    id: ANDROID_HIGH_ALERT_CHANNEL_ID,
    name: 'EchoSense high-priority alerts',
    description:
      'High-priority unverified classroom alerts requiring prompt human review.',
    importance: 'high',
    sound: 'default',
    enableVibrate: true,
  },
] as const;
