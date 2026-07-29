import type { SafeNotificationData } from './notificationPayload';

export type PendingNotificationIntent =
  | {
      type: 'classroom_alert';
      alertId: string;
    }
  | {
      type: 'provider_test';
      testId: string;
      receivedAt: string;
    };

export type PendingNotificationAction =
  | { type: 'wait' }
  | { type: 'none' }
  | { type: 'navigate-alert'; alertId: string }
  | {
      type: 'navigate-provider-test';
      testId: string;
      receivedAt: string;
    };

const SAFE_TEST_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function isLocalReceiptTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    return false;
  }
  return new Date(value).toISOString() === value;
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: string[]
): boolean {
  const keys = Object.keys(value).sort();
  return (
    keys.length === expected.length &&
    keys.every((key, index) => key === [...expected].sort()[index])
  );
}

export function createPendingNotificationIntent(
  data: SafeNotificationData,
  receivedAt: string
): PendingNotificationIntent | null {
  if (data.type === 'classroom_alert') {
    return { type: 'classroom_alert', alertId: data.alertId };
  }
  if (!isLocalReceiptTimestamp(receivedAt)) return null;
  return {
    type: 'provider_test',
    testId: data.testId,
    receivedAt,
  };
}

export function parseStoredNotificationIntent(
  value: unknown
): PendingNotificationIntent | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    record.type === 'classroom_alert' &&
    hasExactKeys(record, ['type', 'alertId']) &&
    typeof record.alertId === 'string' &&
    /^[1-9]\d*$/.test(record.alertId)
  ) {
    return { type: 'classroom_alert', alertId: record.alertId };
  }
  if (
    record.type === 'provider_test' &&
    hasExactKeys(record, ['type', 'testId', 'receivedAt']) &&
    typeof record.testId === 'string' &&
    SAFE_TEST_ID.test(record.testId) &&
    isLocalReceiptTimestamp(record.receivedAt)
  ) {
    return {
      type: 'provider_test',
      testId: record.testId,
      receivedAt: record.receivedAt,
    };
  }
  return null;
}

export function resolvePendingNotificationAction(options: {
  authChecked: boolean;
  navigationReady: boolean;
  isAuthenticated: boolean;
  pendingIntent: PendingNotificationIntent | null;
}): PendingNotificationAction {
  const {
    authChecked,
    navigationReady,
    isAuthenticated,
    pendingIntent,
  } = options;
  if (!pendingIntent) return { type: 'none' };
  if (!authChecked || !navigationReady || !isAuthenticated) {
    return { type: 'wait' };
  }
  return pendingIntent.type === 'provider_test'
    ? {
        type: 'navigate-provider-test',
        testId: pendingIntent.testId,
        receivedAt: pendingIntent.receivedAt,
      }
    : { type: 'navigate-alert', alertId: pendingIntent.alertId };
}

export function maskProviderTestId(testId: string): string {
  if (!SAFE_TEST_ID.test(testId)) return 'Unavailable';
  if (testId.length <= 4) return '••••';
  return `${testId.slice(0, 2)}••••${testId.slice(-2)}`;
}
