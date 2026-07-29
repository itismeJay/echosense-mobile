import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getNotificationEventId,
  getNotificationIdentity,
  getNotificationSeverity,
  isExpectedNotificationCopy,
  isExpectedNotificationCopyForData,
  notificationDataContainsSensitiveFields,
  parseNotificationData,
  parseNotificationEnvelope,
  PROVIDER_TEST_BODY,
  PROVIDER_TEST_ROUTE,
  PROVIDER_TEST_TITLE,
} from '../lib/notificationPayload.ts';
import { NotificationDeduper } from '../lib/notificationDedup.ts';

const EVENT_ID = '123e4567-e89b-42d3-a456-426614174000';
const PROVIDER_DATA = {
  type: 'provider_test',
  test_id: 'safe-test-id',
  route: PROVIDER_TEST_ROUTE,
  severity: 'LOW',
  is_test: true,
};

test('valid provider_test payload and exact approved copy are accepted', () => {
  const parsed = parseNotificationData(PROVIDER_DATA);
  assert.deepEqual(parsed, {
    type: 'provider_test',
    testId: 'safe-test-id',
    route: '/notifications/test',
    severity: 'low',
    isTest: true,
  });
  assert.equal(
    isExpectedNotificationCopyForData(
      PROVIDER_TEST_TITLE,
      PROVIDER_TEST_BODY,
      parsed
    ),
    true
  );
  assert.deepEqual(
    parseNotificationEnvelope(
      PROVIDER_DATA,
      PROVIDER_TEST_TITLE,
      PROVIDER_TEST_BODY
    ),
    parsed
  );
});

test('provider_test requires its exact discriminator and fields', () => {
  const invalid = [
    { ...PROVIDER_DATA, type: undefined },
    { ...PROVIDER_DATA, type: 'unsupported' },
    { ...PROVIDER_DATA, test_id: undefined },
    { ...PROVIDER_DATA, test_id: '' },
    { ...PROVIDER_DATA, test_id: '   ' },
    { ...PROVIDER_DATA, route: '/alert/42' },
    { ...PROVIDER_DATA, is_test: undefined },
    { ...PROVIDER_DATA, is_test: false },
    { ...PROVIDER_DATA, severity: 'HIGH' },
    { ...PROVIDER_DATA, severity: 'low' },
    { ...PROVIDER_DATA, alertId: 42 },
    { ...PROVIDER_DATA, unknown_key: 'value' },
  ];
  for (const value of invalid) {
    assert.equal(parseNotificationData(value), null);
  }
});

test('provider_test rejects every prohibited sensitive field', () => {
  for (const key of [
    'transcript',
    'transcribed_text',
    'matched_terms',
    'hard_hits',
    'soft_hits',
    'categories',
    'waveform_snapshot',
    'raw_audio',
    'audio',
    'student',
    'student_id',
    'studentIdentity',
    'speaker',
    'speaker_id',
    'speakerIdentity',
    'user',
    'user_identity',
    'classroom_accusation',
    'access_token',
    'accessToken',
    'push_token',
    'pushToken',
    'credentials',
  ]) {
    const data = { ...PROVIDER_DATA, [key]: 'synthetic-sensitive-value' };
    assert.equal(notificationDataContainsSensitiveFields(data), true, key);
    assert.equal(parseNotificationData(data), null, key);
  }
});

test('provider_test rejects alternate title or body text', () => {
  assert.equal(
    parseNotificationEnvelope(
      PROVIDER_DATA,
      'Alternate test title',
      PROVIDER_TEST_BODY
    ),
    null
  );
  assert.equal(
    parseNotificationEnvelope(
      PROVIDER_DATA,
      PROVIDER_TEST_TITLE,
      'A classroom alert was created.'
    ),
    null
  );
});

test('foreground provider tests are handled once by test_id', () => {
  const parsed = parseNotificationEnvelope(
    PROVIDER_DATA,
    PROVIDER_TEST_TITLE,
    PROVIDER_TEST_BODY
  );
  assert.ok(parsed);
  const deduper = new NotificationDeduper(1000);
  const identity = getNotificationIdentity(parsed);
  assert.equal(deduper.shouldHandle(identity, 1000), true);
  assert.equal(deduper.shouldHandle(identity, 1500), false);

  const malformed = parseNotificationEnvelope(
    { ...PROVIDER_DATA, route: '/arbitrary' },
    PROVIDER_TEST_TITLE,
    PROVIDER_TEST_BODY
  );
  assert.equal(malformed, null);
});

test('different provider tests and classroom alerts have separate identities', () => {
  const first = parseNotificationData(PROVIDER_DATA);
  const second = parseNotificationData({
    ...PROVIDER_DATA,
    test_id: 'safe-test-id-2',
  });
  const alert = parseNotificationData({
    type: 'classroom_alert',
    alertId: 42,
    severity: 'LOW',
  });
  assert.ok(first);
  assert.ok(second);
  assert.ok(alert);
  assert.notEqual(
    getNotificationIdentity(first),
    getNotificationIdentity(second)
  );
  assert.notEqual(
    getNotificationIdentity(first),
    getNotificationIdentity(alert)
  );
});

test('LOW, MEDIUM, and HIGH classroom data remain distinct', () => {
  assert.equal(getNotificationSeverity({ severity: 'LOW' }), 'low');
  assert.equal(getNotificationSeverity({ severity: 'medium' }), 'medium');
  assert.equal(getNotificationSeverity({ priority: 'HIGH' }), 'high');
  assert.equal(getNotificationSeverity({ severity: 'invalid' }), 'unknown');

  for (const severity of ['LOW', 'MEDIUM', 'HIGH']) {
    const parsed = parseNotificationData({
      type: 'classroom_alert',
      alertId: 42,
      severity,
    });
    assert.equal(parsed?.type, 'classroom_alert');
    assert.equal(parsed?.severity, severity.toLowerCase());
  }
});

test('classroom alerts require a valid alert ID and reject conflicting aliases', () => {
  assert.deepEqual(
    parseNotificationData({
      type: 'classroom_alert',
      alertId: 42,
      event_id: EVENT_ID,
      severity: 'HIGH',
    }),
    {
      type: 'classroom_alert',
      alertId: '42',
      eventId: EVENT_ID,
      severity: 'high',
    }
  );
  assert.equal(
    parseNotificationData({
      type: 'classroom_alert',
      severity: 'LOW',
    }),
    null
  );
  assert.equal(
    parseNotificationData({
      type: 'classroom_alert',
      alertId: 'invalid',
      severity: 'LOW',
    }),
    null
  );
  assert.equal(
    parseNotificationData({
      alertId: 42,
      alert_id: 43,
      severity: 'LOW',
    }),
    null
  );
  assert.equal(getNotificationEventId({ event_id: 'invalid' }), null);
});

test('legacy classroom payload remains supported only for its allowlisted shape', () => {
  assert.deepEqual(
    parseNotificationData({ alertId: 42, severity: 'low' }),
    {
      type: 'classroom_alert',
      alertId: '42',
      eventId: null,
      severity: 'low',
    }
  );
  assert.equal(
    parseNotificationData({
      alertId: 42,
      severity: 'LOW',
      arbitraryRoute: '/notifications/test',
    }),
    null
  );
});

test('classroom data rejects sensitive fields', () => {
  for (const key of [
    'transcript',
    'transcribed_text',
    'matched_terms',
    'hard_hits',
    'soft_hits',
    'categories',
    'waveform_snapshot',
    'student_id',
    'speaker',
    'raw_audio',
    'access_token',
    'push_token',
  ]) {
    const data = {
      type: 'classroom_alert',
      alertId: 42,
      severity: 'LOW',
      [key]: 'synthetic-sensitive-value',
    };
    assert.equal(notificationDataContainsSensitiveFields(data), true);
    assert.equal(parseNotificationData(data), null);
  }
});

test('responsible classroom title and body remain severity-specific', () => {
  for (const copy of [
    [
      'Possible classroom concern',
      'A low-severity unverified alert requires staff review.',
      'low',
    ],
    [
      'Possible verbal-aggression indicators',
      'A medium-severity unverified alert requires staff review.',
      'medium',
    ],
    [
      'High-priority classroom alert',
      'Strong possible-aggression indicators were detected. Prompt human review is recommended.',
      'high',
    ],
  ]) {
    assert.equal(
      isExpectedNotificationCopy(copy[0], copy[1], copy[2]),
      true
    );
  }
  assert.equal(isExpectedNotificationCopy('', 'Body', 'low'), false);
  assert.equal(isExpectedNotificationCopy('Title', null, 'high'), false);
  assert.equal(
    isExpectedNotificationCopy(
      'High-priority classroom alert',
      'A low-severity unverified alert requires staff review.',
      'high'
    ),
    false
  );
});
