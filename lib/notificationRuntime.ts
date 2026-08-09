import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { ANDROID_NOTIFICATION_CHANNELS } from './notificationChannels';

export type ExpoNotificationsModule =
  typeof import('expo-notifications');

export const isExpoGo =
  Constants.executionEnvironment === 'storeClient';

let notificationsPromise: Promise<ExpoNotificationsModule> | null =
  null;
let androidChannelsPromise: Promise<boolean> | null = null;

export async function getExpoNotifications(): Promise<ExpoNotificationsModule | null> {
  if (isExpoGo) return null;

  notificationsPromise ??= import('expo-notifications');
  try {
    return await notificationsPromise;
  } catch {
    notificationsPromise = null;
    return null;
  }
}

export async function ensureAndroidNotificationChannels(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if (isExpoGo) return false;

  androidChannelsPromise ??= (async () => {
    const notifications = await getExpoNotifications();
    if (!notifications) return false;
    for (const channel of ANDROID_NOTIFICATION_CHANNELS) {
      await notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        description: channel.description,
        importance:
          channel.importance === 'high'
            ? notifications.AndroidImportance.HIGH
            : notifications.AndroidImportance.DEFAULT,
        sound: channel.sound,
        enableVibrate: channel.enableVibrate,
        vibrationPattern: [...channel.vibrationPattern],
        lockscreenVisibility:
          notifications.AndroidNotificationVisibility.PRIVATE,
      });
    }
    return true;
  })();

  try {
    return await androidChannelsPromise;
  } catch {
    androidChannelsPromise = null;
    return false;
  }
}
