import type { AlertSeverity } from './types';

export const PROVIDER_TEST_TITLE = 'EchoSense notification test';
export const PROVIDER_TEST_BODY =
  'This is a controlled delivery test for the approved device. No classroom alert was created.';
export const PROVIDER_TEST_ROUTE = '/notifications/test';

const CLASSROOM_ALERT_KEYS = new Set([
  'type',
  'alertId',
  'alert_id',
  'severity',
  'priority',
  'event_id',
  'eventId',
  'isHigh',
]);

const PROVIDER_TEST_KEYS = new Set([
  'type',
  'test_id',
  'route',
  'severity',
  'is_test',
]);

const SENSITIVE_DATA_KEYS = new Set([
  'transcript',
  'transcribed_text',
  'matched_terms',
  'detected_words',
  'hard_hits',
  'soft_hits',
  'categories',
  'waveform_snapshot',
  'raw_audio',
  'audio',
  'student',
  'student_id',
  'studentidentity',
  'student_identity',
  'speaker',
  'speaker_id',
  'speakeridentity',
  'speaker_identity',
  'user',
  'user_id',
  'email',
  'user_email',
  'useremail',
  'useridentity',
  'user_identity',
  'classroom_accusation',
  'classroomaccusation',
  'access_token',
  'accesstoken',
  'push_token',
  'pushtoken',
  'credential',
  'credentials',
  'authorization',
  'password',
]);

export interface SafeClassroomAlertNotificationData {
  type: 'classroom_alert';
  alertId: string;
  eventId: string | null;
  severity: Exclude<AlertSeverity, 'unknown'>;
}

export interface SafeProviderTestNotificationData {
  type: 'provider_test';
  testId: string;
  route: typeof PROVIDER_TEST_ROUTE;
  severity: 'low';
  isTest: true;
}

export type SafeNotificationData =
  | SafeClassroomAlertNotificationData
  | SafeProviderTestNotificationData;

const EXPECTED_NOTIFICATION_COPY: Record<
  Exclude<AlertSeverity, 'unknown'>,
  { title: string; body: string }
> = {
  low: {
    title: 'Possible classroom concern',
    body: 'A low-severity unverified alert requires staff review.',
  },
  medium: {
    title: 'Possible verbal-aggression indicators',
    body: 'A medium-severity unverified alert requires staff review.',
  },
  high: {
    title: 'High-priority classroom alert',
    body: 'Strong possible-aggression indicators were detected. Prompt human review is recommended.',
  },
};

function hasOnlyKeys(
  data: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>
): boolean {
  return Object.keys(data).every((key) => allowedKeys.has(key));
}

function extractStableAlertId(
  data: Record<string, unknown>
): string | null {
  const primary = normalizeAlertId(data.alertId);
  const legacy = normalizeAlertId(data.alert_id);
  if (primary && legacy && primary !== legacy) return null;
  return primary ?? legacy;
}

function normalizeAlertId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value.trim())) {
    return String(Number(value.trim()));
  }
  return null;
}

function isValidProviderTestId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 128 &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
  );
}

function normalizeSensitiveKey(key: string): string {
  return key.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function notificationDataContainsSensitiveFields(
  data: Record<string, unknown> | null | undefined
): boolean {
  if (!data) return false;
  return Object.keys(data).some((key) => {
    const normalized = normalizeSensitiveKey(key);
    const flattened = normalized.replace(/_/g, '');
    return (
      SENSITIVE_DATA_KEYS.has(normalized) ||
      SENSITIVE_DATA_KEYS.has(flattened) ||
      flattened.includes('accesstoken') ||
      flattened.includes('pushtoken') ||
      flattened.includes('credential')
    );
  });
}

export function getNotificationSeverity(
  data: Record<string, unknown> | null | undefined
): AlertSeverity {
  const value = data?.severity ?? data?.priority;
  if (typeof value !== 'string') return 'unknown';
  switch (value.trim().toUpperCase()) {
    case 'HIGH':
      return 'high';
    case 'MEDIUM':
      return 'medium';
    case 'LOW':
      return 'low';
    default:
      return 'unknown';
  }
}

export function getNotificationEventId(
  data: Record<string, unknown> | null | undefined
): string | null {
  const primary = normalizeEventId(data?.event_id);
  const legacy = normalizeEventId(data?.eventId);
  if (primary && legacy && primary !== legacy) return null;
  return primary ?? legacy;
}

function normalizeEventId(value: unknown): string | null {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
    ? value
    : null;
}

function parseClassroomAlertData(
  data: Record<string, unknown>
): SafeClassroomAlertNotificationData | null {
  if (
    !hasOnlyKeys(data, CLASSROOM_ALERT_KEYS) ||
    notificationDataContainsSensitiveFields(data)
  ) {
    return null;
  }
  if (
    data.type !== undefined &&
    data.type !== 'classroom_alert'
  ) {
    return null;
  }

  const alertId = extractStableAlertId(data);
  const severity = getNotificationSeverity(data);
  if (!alertId || severity === 'unknown') return null;

  if (
    data.severity !== undefined &&
    data.priority !== undefined &&
    getNotificationSeverity({ severity: data.severity }) !==
      getNotificationSeverity({ priority: data.priority })
  ) {
    return null;
  }
  if (
    data.isHigh !== undefined &&
    (typeof data.isHigh !== 'boolean' ||
      data.isHigh !== (severity === 'high'))
  ) {
    return null;
  }

  return {
    type: 'classroom_alert',
    alertId,
    eventId: getNotificationEventId(data),
    severity,
  };
}

function parseProviderTestData(
  data: Record<string, unknown>
): SafeProviderTestNotificationData | null {
  if (
    !hasOnlyKeys(data, PROVIDER_TEST_KEYS) ||
    Object.keys(data).length !== PROVIDER_TEST_KEYS.size ||
    notificationDataContainsSensitiveFields(data) ||
    data.type !== 'provider_test' ||
    !isValidProviderTestId(data.test_id) ||
    data.route !== PROVIDER_TEST_ROUTE ||
    data.severity !== 'LOW' ||
    data.is_test !== true
  ) {
    return null;
  }

  return {
    type: 'provider_test',
    testId: data.test_id,
    route: PROVIDER_TEST_ROUTE,
    severity: 'low',
    isTest: true,
  };
}

export function parseNotificationData(
  data: Record<string, unknown> | null | undefined
): SafeNotificationData | null {
  if (!data || notificationDataContainsSensitiveFields(data)) return null;

  if (data.type === 'provider_test') return parseProviderTestData(data);
  if (data.type === 'classroom_alert') return parseClassroomAlertData(data);
  if (data.type !== undefined) return null;

  // Backward compatibility is limited to the existing, allowlisted classroom
  // payload shape. Missing type is never accepted for provider-test fields.
  if ('alertId' in data || 'alert_id' in data) {
    return parseClassroomAlertData(data);
  }
  return null;
}

export function isExpectedNotificationCopy(
  title: unknown,
  body: unknown,
  severity: AlertSeverity
): boolean {
  if (
    typeof title !== 'string' ||
    title.length > 120 ||
    typeof body !== 'string' ||
    body.length > 500 ||
    severity === 'unknown'
  ) {
    return false;
  }
  const expected = EXPECTED_NOTIFICATION_COPY[severity];
  return title === expected.title && body === expected.body;
}

export function isExpectedNotificationCopyForData(
  title: unknown,
  body: unknown,
  data: SafeNotificationData
): boolean {
  if (data.type === 'provider_test') {
    return title === PROVIDER_TEST_TITLE && body === PROVIDER_TEST_BODY;
  }
  return isExpectedNotificationCopy(title, body, data.severity);
}

export function parseNotificationEnvelope(
  data: Record<string, unknown> | null | undefined,
  title: unknown,
  body: unknown
): SafeNotificationData | null {
  const parsed = parseNotificationData(data);
  return parsed && isExpectedNotificationCopyForData(title, body, parsed)
    ? parsed
    : null;
}

export function getNotificationIdentity(
  data: SafeNotificationData
): string {
  return data.type === 'provider_test'
    ? `provider_test:${data.testId}`
    : `classroom_alert:${data.alertId}`;
}
