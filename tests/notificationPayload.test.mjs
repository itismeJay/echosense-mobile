import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ALERT_TEST_BODY,
  ALERT_TEST_TITLE,
  getNotificationIdentity,
  getNotificationSeverity,
  notificationDataContainsSensitiveFields,
  parseNotificationData,
  parseNotificationEnvelope,
  PROVIDER_TEST_BODY,
  PROVIDER_TEST_ROUTE,
  PROVIDER_TEST_TITLE,
} from '../lib/notificationPayload.ts';

const EVENT_ID = '123e4567-e89b-42d3-a456-426614174000';
const FINALIZED_DATA = {
  type: 'classroom_alert',
  alertId: 123,
  event_id: EVENT_ID,
  severity: 'high',
  severityLevel: 'HIGH',
  trigger_type: 'KEYWORD',
  route: '/alert/123',
  is_test: false,
};
const PROVIDER_DATA = {
  type: 'provider_test',
  test_id: 'safe-test-id',
  route: PROVIDER_TEST_ROUTE,
  severity: 'LOW',
  is_test: true,
};

test('complete finalized classroom payload is normalized to trusted data', () => {
  assert.deepEqual(parseNotificationData(FINALIZED_DATA), {
    type: 'classroom_alert',
    alertId: 123,
    eventId: EVENT_ID,
    severity: 'high',
    severityLevel: 'HIGH',
    triggerType: 'KEYWORD',
    isTest: false,
  });
});

test('LOW, MEDIUM, and HIGH normalize case-insensitively', () => {
  for (const [input, canonical, normalized] of [
    ['low', 'LOW', 'low'],
    ['MeDiUm', 'medium', 'medium'],
    ['HIGH', 'high', 'high'],
  ]) {
    const parsed = parseNotificationData({
      ...FINALIZED_DATA,
      severity: input,
      severityLevel: canonical,
    });
    assert.equal(parsed?.severity, normalized);
    assert.equal(parsed?.severityLevel, normalized.toUpperCase());
  }
  assert.equal(getNotificationSeverity({ severity: 'invalid' }), 'unknown');
});

test('severity and severityLevel must agree', () => {
  assert.equal(
    parseNotificationData({
      ...FINALIZED_DATA,
      severity: 'LOW',
      severityLevel: 'HIGH',
    }),
    null
  );
});

test('trigger_type accepts only KEYWORD, ACOUSTIC, and TEST', () => {
  for (const trigger_type of ['KEYWORD', 'ACOUSTIC']) {
    assert.ok(parseNotificationData({ ...FINALIZED_DATA, trigger_type }));
  }
  for (const trigger_type of ['keyword', 'UNKNOWN', '', null]) {
    assert.equal(
      parseNotificationData({ ...FINALIZED_DATA, trigger_type }),
      null
    );
  }
});

test('finalized event_id is required and must be a UUID', () => {
  assert.equal(parseNotificationData(FINALIZED_DATA)?.eventId, EVENT_ID);
  for (const event_id of [undefined, null, '', 'not-a-uuid']) {
    assert.equal(parseNotificationData({ ...FINALIZED_DATA, event_id }), null);
  }
});

test('numeric-string alert IDs normalize and must agree with the exact route', () => {
  assert.equal(
    parseNotificationData({
      ...FINALIZED_DATA,
      alertId: '123',
    })?.alertId,
    123
  );
  for (const value of [
    { ...FINALIZED_DATA, route: '/alert/124' },
    { ...FINALIZED_DATA, route: '/alert/123/' },
    { ...FINALIZED_DATA, route: '/notifications/test' },
    { ...FINALIZED_DATA, alertId: '00123' },
    { ...FINALIZED_DATA, alertId: Number.MAX_SAFE_INTEGER + 1 },
  ]) {
    assert.equal(parseNotificationData(value), null);
  }
});

test('TEST trigger and is_test marker are cross-validated', () => {
  const testData = {
    ...FINALIZED_DATA,
    trigger_type: 'TEST',
    is_test: true,
  };
  assert.equal(parseNotificationData(testData)?.isTest, true);
  assert.equal(
    parseNotificationData({ ...testData, is_test: false }),
    null
  );
  assert.equal(
    parseNotificationData({ ...FINALIZED_DATA, is_test: true }),
    null
  );
});

test('finalized alert TEST accepts only the exact approved copy', () => {
  const data = {
    ...FINALIZED_DATA,
    trigger_type: 'TEST',
    is_test: true,
  };
  assert.ok(parseNotificationEnvelope(data, ALERT_TEST_TITLE, ALERT_TEST_BODY));
  assert.equal(
    parseNotificationEnvelope(data, `${ALERT_TEST_TITLE} `, ALERT_TEST_BODY),
    null
  );
  assert.equal(
    parseNotificationEnvelope(data, ALERT_TEST_TITLE, 'Alternate body'),
    null
  );
});

test('normal classroom copy remains privacy-minimized and severity-specific', () => {
  const copies = {
    LOW: [
      'Possible classroom concern',
      'A low-severity unverified alert requires staff review.',
    ],
    MEDIUM: [
      'Possible verbal-aggression indicators',
      'A medium-severity unverified alert requires staff review.',
    ],
    HIGH: [
      'High-priority classroom alert',
      'Strong possible-aggression indicators were detected. Prompt human review is recommended.',
    ],
  };
  for (const [severity, [title, body]] of Object.entries(copies)) {
    const data = {
      ...FINALIZED_DATA,
      severity,
      severityLevel: severity,
    };
    assert.ok(parseNotificationEnvelope(data, title, body));
  }
});

test('provider-only tests remain separate from classroom alerts', () => {
  assert.deepEqual(
    parseNotificationEnvelope(
      PROVIDER_DATA,
      PROVIDER_TEST_TITLE,
      PROVIDER_TEST_BODY
    ),
    {
      type: 'provider_test',
      testId: 'safe-test-id',
      route: '/notifications/test',
      severity: 'low',
      isTest: true,
    }
  );
  assert.equal(
    parseNotificationEnvelope(
      { ...PROVIDER_DATA, alertId: 123 },
      PROVIDER_TEST_TITLE,
      PROVIDER_TEST_BODY
    ),
    null
  );
});

test('unknown and sensitive top-level fields fail closed', () => {
  assert.equal(
    parseNotificationData({ ...FINALIZED_DATA, unknown_key: 'value' }),
    null
  );
  for (const key of [
    'transcript',
    'transcription_text',
    'monitored_terms',
    'matched_terms',
    'detected_words',
    'evidence',
    'raw_audio',
    'student_id',
    'speaker',
    'classroom_id',
    'school',
    'credentials',
    'jwt',
    'authorization',
    'password',
    'push_token',
  ]) {
    const data = { ...FINALIZED_DATA, [key]: 'sensitive-value' };
    assert.equal(notificationDataContainsSensitiveFields(data), true, key);
    assert.equal(parseNotificationData(data), null, key);
  }
});

test('legacy route-free classroom compatibility is deliberate and isolated', () => {
  assert.deepEqual(parseNotificationData({ alertId: 42, severity: 'LOW' }), {
    type: 'classroom_alert',
    alertId: 42,
    eventId: null,
    severity: 'low',
    severityLevel: 'LOW',
    triggerType: 'KEYWORD',
    isTest: false,
  });
  assert.equal(
    parseNotificationData({
      alertId: 42,
      severity: 'LOW',
      route: '/alert/42',
    }),
    null
  );
});

test('notification identity namespaces provider and finalized events', () => {
  const alert = parseNotificationData(FINALIZED_DATA);
  const provider = parseNotificationData(PROVIDER_DATA);
  assert.equal(getNotificationIdentity(alert), `classroom_alert:${EVENT_ID}`);
  assert.equal(getNotificationIdentity(provider), 'provider_test:safe-test-id');
});
