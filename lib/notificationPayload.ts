import type { AlertSeverity, CanonicalSeverity } from './types';

export const ALERT_TEST_TITLE = 'EchoSense Alert — TEST';
export const ALERT_TEST_BODY =
  'TEST possible verbal-aggression event. Human review required.';
export const PROVIDER_TEST_TITLE = 'EchoSense notification test';
export const PROVIDER_TEST_BODY =
  'This is a controlled delivery test for the approved device. No classroom alert was created.';
export const PROVIDER_TEST_ROUTE = '/notifications/test';

const FINALIZED_CLASSROOM_ALERT_KEYS = new Set([
  'type',
  'alertId',
  'event_id',
  'severity',
  'severityLevel',
  'trigger_type',
  'route',
  'is_test',
]);

const LEGACY_CLASSROOM_ALERT_KEYS = new Set([
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
  'transcription',
  'transcription_text',
  'transcribed_text',
  'monitored_terms',
  'matched_terms',
  'detected_words',
  'hard_hits',
  'soft_hits',
  'categories',
  'evidence',
  'severity_evidence',
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
  'classroom',
  'classroom_id',
  'school',
  'school_id',
  'classroom_accusation',
  'classroomaccusation',
  'access_token',
  'accesstoken',
  'push_token',
  'pushtoken',
  'token',
  'jwt',
  'credential',
  'credentials',
  'authorization',
  'password',
]);

export type NotificationTriggerType = 'KEYWORD' | 'ACOUSTIC' | 'TEST';

export interface SafeClassroomAlertNotificationData {
  type: 'classroom_alert';
  alertId: number;
  eventId: string | null;
  severity: Exclude<AlertSeverity, 'unknown'>;
  severityLevel: CanonicalSeverity;
  triggerType: NotificationTriggerType;
  isTest: boolean;
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

function hasExactKeys(
  data: Record<string, unknown>,
  expectedKeys: ReadonlySet<string>
): boolean {
  return (
    Object.keys(data).length === expectedKeys.size &&
    hasOnlyKeys(data, expectedKeys)
  );
}

export function normalizeNotificationAlertId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return value;
  }
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value.trim())) {
    return null;
  }
  const normalized = Number(value.trim());
  return Number.isSafeInteger(normalized) && normalized > 0
    ? normalized
    : null;
}

function extractLegacyAlertId(
  data: Record<string, unknown>
): number | null {
  const primary = normalizeNotificationAlertId(data.alertId);
  const legacy = normalizeNotificationAlertId(data.alert_id);
  if (primary && legacy && primary !== legacy) return null;
  return primary ?? legacy;
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
      flattened.includes('credential') ||
      flattened.includes('authorization')
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

function getCanonicalSeverity(value: unknown): CanonicalSeverity | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return normalized === 'LOW' ||
    normalized === 'MEDIUM' ||
    normalized === 'HIGH'
    ? normalized
    : null;
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
    ? value.toLowerCase()
    : null;
}

function parseFinalizedClassroomAlertData(
  data: Record<string, unknown>
): SafeClassroomAlertNotificationData | null {
  if (
    !hasExactKeys(data, FINALIZED_CLASSROOM_ALERT_KEYS) ||
    notificationDataContainsSensitiveFields(data) ||
    data.type !== 'classroom_alert'
  ) {
    return null;
  }

  const alertId = normalizeNotificationAlertId(data.alertId);
  const eventId = getNotificationEventId(data);
  const severity = getNotificationSeverity({ severity: data.severity });
  const severityLevel = getCanonicalSeverity(data.severityLevel);
  const triggerType = data.trigger_type;
  const isTest = data.is_test;
  if (
    !alertId ||
    !eventId ||
    severity === 'unknown' ||
    !severityLevel ||
    severity.toUpperCase() !== severityLevel ||
    (triggerType !== 'KEYWORD' &&
      triggerType !== 'ACOUSTIC' &&
      triggerType !== 'TEST') ||
    typeof isTest !== 'boolean' ||
    (triggerType === 'TEST') !== isTest ||
    data.route !== `/alert/${alertId}`
  ) {
    return null;
  }

  return {
    type: 'classroom_alert',
    alertId,
    eventId,
    severity,
    severityLevel,
    triggerType,
    isTest,
  };
}

function parseLegacyClassroomAlertData(
  data: Record<string, unknown>
): SafeClassroomAlertNotificationData | null {
  if (
    !hasOnlyKeys(data, LEGACY_CLASSROOM_ALERT_KEYS) ||
    notificationDataContainsSensitiveFields(data)
  ) {
    return null;
  }

  const alertId = extractLegacyAlertId(data);
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
    severityLevel: severity.toUpperCase() as CanonicalSeverity,
    triggerType: 'KEYWORD',
    isTest: false,
  };
}

function parseProviderTestData(
  data: Record<string, unknown>
): SafeProviderTestNotificationData | null {
  if (
    !hasExactKeys(data, PROVIDER_TEST_KEYS) ||
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
  if (data.type === 'classroom_alert') {
    return parseFinalizedClassroomAlertData(data);
  }
  if (data.type !== undefined) return null;

  // Deliberate compatibility for the pre-Phase-3 allowlisted classroom shape.
  // It cannot carry TEST state or any caller-supplied route.
  if ('alertId' in data || 'alert_id' in data) {
    return parseLegacyClassroomAlertData(data);
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
  if (data.isTest) {
    return title === ALERT_TEST_TITLE && body === ALERT_TEST_BODY;
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
    : `classroom_alert:${data.eventId ?? data.alertId}`;
}
