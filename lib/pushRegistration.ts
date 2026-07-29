export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export type PushRegistrationResult =
  | { status: 'registered'; token: string }
  | { status: 'already-registered'; token: string }
  | {
      status:
        | 'not-authenticated'
        | 'physical-device-required'
        | 'unsupported-build'
        | 'permission-denied'
        | 'token-unavailable'
        | 'registration-failed';
    };

export interface StoredPushRegistration {
  userId: string;
  token: string;
}

export interface PushRegistrationDependencies {
  userId: string | null;
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
  if (!isPhysicalDevice) return { status: 'physical-device-required' };
  if (!isSupportedBuild) return { status: 'unsupported-build' };

  const existingPermission = await getPermissionStatus();
  const finalPermission =
    existingPermission === 'undetermined'
      ? await requestPermission()
      : existingPermission;
  if (finalPermission !== 'granted') return { status: 'permission-denied' };

  let token: string;
  try {
    token = await getPushToken();
  } catch {
    return { status: 'token-unavailable' };
  }
  if (!isExpoPushToken(token)) return { status: 'token-unavailable' };

  const stored = await getStoredRegistration();
  if (stored?.userId === userId && stored.token === token) {
    return { status: 'already-registered', token };
  }

  try {
    await registerToken(token);
    await storeRegistration({ userId, token });
  } catch {
    return { status: 'registration-failed' };
  }

  return { status: 'registered', token };
}
