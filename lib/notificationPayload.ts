import type { AlertSeverity } from './types';

const SENSITIVE_DATA_KEYS = new Set([
  'transcript',
  'transcribed_text',
  'matched_terms',
  'detected_words',
  'student',
  'student_id',
  'speaker',
  'speaker_id',
  'raw_audio',
  'audio',
]);

export interface SafeNotificationData {
  alertId: string;
  eventId: string | null;
  severity: AlertSeverity;
}

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

function extractStableAlertId(
  data: Record<string, unknown> | null | undefined
): string | null {
  const value = data?.alertId ?? data?.alert_id;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value.trim())) {
    return String(Number(value.trim()));
  }
  return null;
}

export function notificationDataContainsSensitiveFields(
  data: Record<string, unknown> | null | undefined
): boolean {
  if (!data) return false;
  return Object.keys(data).some((key) =>
    SENSITIVE_DATA_KEYS.has(key.trim().toLowerCase())
  );
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
  const value = data?.event_id ?? data?.eventId;
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
    ? value
    : null;
}

export function parseNotificationData(
  data: Record<string, unknown> | null | undefined
): SafeNotificationData | null {
  const alertId = extractStableAlertId(data);
  if (!alertId || notificationDataContainsSensitiveFields(data)) return null;
  return {
    alertId,
    eventId: getNotificationEventId(data),
    severity: getNotificationSeverity(data),
  };
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
