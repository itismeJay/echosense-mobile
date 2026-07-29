import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getNotificationEventId,
  getNotificationSeverity,
  isExpectedNotificationCopy,
  notificationDataContainsSensitiveFields,
  parseNotificationData,
} from '../lib/notificationPayload.ts';

const EVENT_ID = '123e4567-e89b-42d3-a456-426614174000';

test('LOW, MEDIUM, and HIGH notification data remain distinct', () => {
  assert.equal(getNotificationSeverity({ severity: 'LOW' }), 'low');
  assert.equal(getNotificationSeverity({ severity: 'medium' }), 'medium');
  assert.equal(getNotificationSeverity({ priority: 'HIGH' }), 'high');
  assert.equal(getNotificationSeverity({ severity: 'invalid' }), 'unknown');
});

test('valid alert ID is required and event ID remains supporting identity', () => {
  assert.deepEqual(
    parseNotificationData({
      alertId: 42,
      event_id: EVENT_ID,
      severity: 'HIGH',
    }),
    { alertId: '42', eventId: EVENT_ID, severity: 'high' }
  );
  assert.equal(parseNotificationData({ alertId: 'invalid' }), null);
  assert.equal(getNotificationEventId({ event_id: 'invalid' }), null);
});

test('notification data containing transcript or identity fields is rejected', () => {
  for (const key of [
    'transcript',
    'transcribed_text',
    'matched_terms',
    'student_id',
    'speaker',
    'raw_audio',
  ]) {
    const data = { alertId: 42, [key]: 'synthetic-sensitive-value' };
    assert.equal(notificationDataContainsSensitiveFields(data), true);
    assert.equal(parseNotificationData(data), null);
  }
});

test('responsible remote title and body are preserved only when structurally valid', () => {
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
