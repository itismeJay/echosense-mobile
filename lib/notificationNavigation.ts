import type { CanonicalSeverity } from './types';
import type {
  NotificationTriggerType,
  SafeNotificationData,
} from './notificationPayload';

export const MAX_PENDING_NOTIFICATION_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

export type PendingNotificationIntent =
  | {
      type: 'classroom_alert';
      alertId: number;
      eventId: string | null;
      severity: CanonicalSeverity;
      triggerType: NotificationTriggerType;
      isTest: boolean;
      receivedAt: string;
    }
  | {
      type: 'provider_test';
      testId: string;
      receivedAt: string;
    };

export type PendingNotificationAction =
  | { type: 'wait' }
  | { type: 'none' }
  | {
      type: 'navigate-alert';
      alertId: number;
      eventId: string | null;
      severity: CanonicalSeverity;
      triggerType: NotificationTriggerType;
      isTest: boolean;
    }
  | {
      type: 'navigate-provider-test';
      testId: string;
      receivedAt: string;
    };

const SAFE_TEST_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isLocalReceiptTimestamp(
  value: unknown,
  now = Date.now()
): value is string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    return false;
  }
  const timestamp = Date.parse(value);
  return (
    new Date(value).toISOString() === value &&
    timestamp <= now + MAX_FUTURE_CLOCK_SKEW_MS &&
    now - timestamp <= MAX_PENDING_NOTIFICATION_AGE_MS
  );
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: string[]
): boolean {
  const keys = Object.keys(value).sort();
  const expectedKeys = [...expected].sort();
  return (
    keys.length === expectedKeys.length &&
    keys.every((key, index) => key === expectedKeys[index])
  );
}

function isCanonicalSeverity(value: unknown): value is CanonicalSeverity {
  return value === 'LOW' || value === 'MEDIUM' || value === 'HIGH';
}

function isTriggerType(value: unknown): value is NotificationTriggerType {
  return value === 'KEYWORD' || value === 'ACOUSTIC' || value === 'TEST';
}

export function createPendingNotificationIntent(
  data: SafeNotificationData,
  receivedAt: string,
  now = Date.now()
): PendingNotificationIntent | null {
  if (!isLocalReceiptTimestamp(receivedAt, now)) return null;
  if (data.type === 'classroom_alert') {
    return {
      type: 'classroom_alert',
      alertId: data.alertId,
      eventId: data.eventId,
      severity: data.severityLevel,
      triggerType: data.triggerType,
      isTest: data.isTest,
      receivedAt,
    };
  }
  return {
    type: 'provider_test',
    testId: data.testId,
    receivedAt,
  };
}

export function createLegacyAlertIntent(
  alertId: number,
  receivedAt: string,
  now = Date.now()
): PendingNotificationIntent | null {
  if (
    !Number.isSafeInteger(alertId) ||
    alertId <= 0 ||
    !isLocalReceiptTimestamp(receivedAt, now)
  ) {
    return null;
  }
  return {
    type: 'classroom_alert',
    alertId,
    eventId: null,
    severity: 'LOW',
    triggerType: 'KEYWORD',
    isTest: false,
    receivedAt,
  };
}

export function parseStoredNotificationIntent(
  value: unknown,
  now = Date.now()
): PendingNotificationIntent | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    record.type === 'classroom_alert' &&
    hasExactKeys(record, [
      'type',
      'alertId',
      'eventId',
      'severity',
      'triggerType',
      'isTest',
      'receivedAt',
    ]) &&
    Number.isSafeInteger(record.alertId) &&
    (record.alertId as number) > 0 &&
    (record.eventId === null ||
      (typeof record.eventId === 'string' && UUID.test(record.eventId))) &&
    isCanonicalSeverity(record.severity) &&
    isTriggerType(record.triggerType) &&
    typeof record.isTest === 'boolean' &&
    (record.triggerType === 'TEST') === record.isTest &&
    isLocalReceiptTimestamp(record.receivedAt, now)
  ) {
    return {
      type: 'classroom_alert',
      alertId: record.alertId as number,
      eventId: record.eventId as string | null,
      severity: record.severity,
      triggerType: record.triggerType,
      isTest: record.isTest,
      receivedAt: record.receivedAt,
    };
  }
  if (
    record.type === 'provider_test' &&
    hasExactKeys(record, ['type', 'testId', 'receivedAt']) &&
    typeof record.testId === 'string' &&
    SAFE_TEST_ID.test(record.testId) &&
    isLocalReceiptTimestamp(record.receivedAt, now)
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
  now?: number;
}): PendingNotificationAction {
  const {
    authChecked,
    navigationReady,
    isAuthenticated,
    pendingIntent,
    now = Date.now(),
  } = options;
  if (!pendingIntent) return { type: 'none' };
  if (!isLocalReceiptTimestamp(pendingIntent.receivedAt, now)) {
    return { type: 'none' };
  }
  if (!authChecked || !navigationReady || !isAuthenticated) {
    return { type: 'wait' };
  }
  return pendingIntent.type === 'provider_test'
    ? {
        type: 'navigate-provider-test',
        testId: pendingIntent.testId,
        receivedAt: pendingIntent.receivedAt,
      }
    : {
        type: 'navigate-alert',
        alertId: pendingIntent.alertId,
        eventId: pendingIntent.eventId,
        severity: pendingIntent.severity,
        triggerType: pendingIntent.triggerType,
        isTest: pendingIntent.isTest,
      };
}

export function maskProviderTestId(testId: string): string {
  if (!SAFE_TEST_ID.test(testId)) return 'Unavailable';
  if (testId.length <= 4) return '••••';
  return `${testId.slice(0, 2)}••••${testId.slice(-2)}`;
}
