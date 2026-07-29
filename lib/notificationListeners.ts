export interface RemovableSubscription {
  remove: () => void;
}
export interface NotificationListenerSource<TNotification, TResponse> {
  addReceivedListener: (
    listener: (notification: TNotification) => void
  ) => RemovableSubscription;
  addResponseListener: (
    listener: (response: TResponse) => void
  ) => RemovableSubscription;
}

export function createNotificationListenerManager<
  TNotification,
  TResponse,
>() {
  let cleanup: (() => void) | null = null;

  return {
    start(
      source: NotificationListenerSource<TNotification, TResponse>,
      onReceived: (notification: TNotification) => void,
      onResponse: (response: TResponse) => void
    ): () => void {
      if (cleanup) return cleanup;

      const received = source.addReceivedListener(onReceived);
      const response = source.addResponseListener(onResponse);
      cleanup = () => {
        received.remove();
        response.remove();
        cleanup = null;
      };
      return cleanup;
    },
    isActive(): boolean {
      return cleanup !== null;
    },
  };
}
