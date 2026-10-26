export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export type PushRegistrationResult =
  | { status: 'registered'; token: string }
  | { status: 'already-registered'; token: string }
  | {
      status:
        | 'not-authenticated'
        | 'password-change-pending'
        | 'physical-device-required'
        | 'unsupported-build'
        | 'channel-setup-failed'
        | 'permission-query-failed'
        | 'permission-request-failed'
        | 'permission-denied'
        | 'token-unavailable'
        | 'storage-unavailable'
        | 'registration-failed';
    };

export interface StoredPushRegistration {
  userId: string;
  token: string;
  /** The server the token was sent to. Missing on older stored registrations. */
  serverUrl?: string;
}

export interface PushRegistrationDependencies {
  userId: string | null;
  serverUrl: string;
  /**
   * The backend answers 403 to /users/push-token until the forced password
   * change is done, so registration waits for it instead of failing.
   */
  passwordChangePending: boolean;
  isPasswordChangeRequiredError?: (caught: unknown) => boolean;
  isPhysicalDevice: boolean;
  isSupportedBuild: boolean;
  getPermissionStatus: () => Promise<PermissionStatus>;
  requestPermission: () => Promise<PermissionStatus>;
  getPushToken: () => Promise<string>;
  getStoredRegistration: () => Promise<StoredPushRegistration | null>;
  registerToken: (token: string) => Promise<void>;
  storeRegistration: (registration: StoredPushRegistration) => Promise<void>;
}

export function isExpoPushToken(token: string): boolean {
  return /^(?:Expo|Exponent)PushToken\[[^\]\s]+\]$/.test(token);
}

export async function runPushRegistration(
  dependencies: PushRegistrationDependencies
): Promise<PushRegistrationResult> {
  const {
    userId,
    serverUrl,
    passwordChangePending,
    isPasswordChangeRequiredError,
    isPhysicalDevice,
    isSupportedBuild,
    getPermissionStatus,
    requestPermission,
    getPushToken,
    getStoredRegistration,
    registerToken,
    storeRegistration,
  } = dependencies;

  if (!userId) return { status: 'not-authenticated' };
  if (passwordChangePending) return { status: 'password-change-pending' };
  if (!isPhysicalDevice) return { status: 'physical-device-required' };
  if (!isSupportedBuild) return { status: 'unsupported-build' };

  let existingPermission: PermissionStatus;
  try {
    existingPermission = await getPermissionStatus();
  } catch {
    return { status: 'permission-query-failed' };
  }

  let finalPermission = existingPermission;
  if (existingPermission === 'undetermined') {
    try {
      finalPermission = await requestPermission();
    } catch {
      return { status: 'permission-request-failed' };
    }
  }
  if (finalPermission !== 'granted') return { status: 'permission-denied' };

  let token: string;
  try {
    token = await getPushToken();
  } catch {
    return { status: 'token-unavailable' };
  }
  if (!isExpoPushToken(token)) return { status: 'token-unavailable' };

  let stored: StoredPushRegistration | null;
  try {
    stored = await getStoredRegistration();
  } catch {
    return { status: 'storage-unavailable' };
  }
  if (
    stored?.userId === userId &&
    stored.token === token &&
    stored.serverUrl === serverUrl
  ) {
    return { status: 'already-registered', token };
  }

  try {
    await registerToken(token);
  } catch (caught: unknown) {
    return isPasswordChangeRequiredError?.(caught)
      ? { status: 'password-change-pending' }
      : { status: 'registration-failed' };
  }

  try {
    await storeRegistration({ userId, token, serverUrl });
  } catch {
    return { status: 'storage-unavailable' };
  }

  return { status: 'registered', token };
}

interface RemovableSubscription {
  remove: () => void;
}

export interface PushRegistrationLifecycleDependencies {
  syncRegistration: () => Promise<PushRegistrationResult>;
  addPushTokenChangeListener: (
    listener: () => void
  ) => RemovableSubscription;
  addAppStateChangeListener: (
    listener: (state: string) => void
  ) => RemovableSubscription;
}

export function createPushRegistrationLifecycle(
  dependencies: PushRegistrationLifecycleDependencies
): { start: () => () => void; isActive: () => boolean } {
  let stopCurrent: (() => void) | null = null;
  let retryInFlight: Promise<PushRegistrationResult> | null = null;

  function retry(): void {
    retryInFlight ??= dependencies.syncRegistration().finally(() => {
      retryInFlight = null;
    });
    void retryInFlight;
  }

  return {
    start() {
      if (stopCurrent) return stopCurrent;
      const tokenSubscription = dependencies.addPushTokenChangeListener(retry);
      const appStateSubscription = dependencies.addAppStateChangeListener(
        (state) => {
          if (state === 'active') retry();
        }
      );
      stopCurrent = () => {
        tokenSubscription.remove();
        appStateSubscription.remove();
        stopCurrent = null;
      };
      return stopCurrent;
    },
    isActive: () => stopCurrent !== null,
  };
}
