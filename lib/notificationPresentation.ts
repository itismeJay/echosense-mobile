import type { SafeNotificationData } from './notificationPayload';

export interface ForegroundNotificationBehavior {
  shouldShowAlert: boolean;
  shouldShowBanner: boolean;
  shouldShowList: boolean;
  shouldPlaySound: boolean;
  shouldSetBadge: boolean;
}

export function getForegroundNotificationBehavior(
  notification: SafeNotificationData | null,
  shouldPresent: boolean
): ForegroundNotificationBehavior {
  const accepted = Boolean(notification) && shouldPresent;
  return {
    shouldShowAlert: accepted,
    shouldShowBanner: accepted,
    shouldShowList: accepted,
    shouldPlaySound: accepted,
    // EchoSense does not maintain an authoritative unread-alert count.
    shouldSetBadge: false,
  };
}
