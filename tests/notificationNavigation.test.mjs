import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPendingNotificationIntent,
  maskProviderTestId,
  MAX_PENDING_NOTIFICATION_AGE_MS,
  parseStoredNotificationIntent,
  resolvePendingNotificationAction,
} from '../lib/notificationNavigation.ts';

const RECEIVED_AT = '2026-08-04T12:00:00.000Z';
const NOW = Date.parse(RECEIVED_AT);
const EVENT_ID = '123e4567-e89b-42d3-a456-426614174000';
const ALERT_DATA = {
  type: 'classroom_alert',
  alertId: 42,
  eventId: EVENT_ID,
  severity: 'high',
  severityLevel: 'HIGH',
  triggerType: 'TEST',
  isTest: true,
};
const ALERT_INTENT = {
  type: 'classroom_alert',
  alertId: 42,
  eventId: EVENT_ID,
  severity: 'HIGH',
  triggerType: 'TEST',
  isTest: true,
  receivedAt: RECEIVED_AT,
};
const TEST_INTENT = {
  type: 'provider_test',
  testId: 'safe-test-id',
  receivedAt: RECEIVED_AT,
};

test('classroom notification creates the minimal trusted typed intent', () => {
  assert.deepEqual(
    createPendingNotificationIntent(ALERT_DATA, RECEIVED_AT, NOW),
    ALERT_INTENT
  );
  assert.equal('route' in ALERT_INTENT, false);
  assert.equal('transcript' in ALERT_INTENT, false);
  assert.equal('evidence' in ALERT_INTENT, false);
});

test('provider-only intent stays separate and contains a local receipt time', () => {
  assert.deepEqual(
    createPendingNotificationIntent(
      {
        type: 'provider_test',
        testId: 'safe-test-id',
        route: '/notifications/test',
        severity: 'low',
        isTest: true,
      },
      RECEIVED_AT,
      NOW
    ),
    TEST_INTENT
  );
});

test('unauthenticated and router-not-ready taps wait', () => {
  for (const options of [
    { authChecked: true, navigationReady: true, isAuthenticated: false },
    { authChecked: false, navigationReady: false, isAuthenticated: false },
    { authChecked: true, navigationReady: false, isAuthenticated: true },
  ]) {
    assert.deepEqual(
      resolvePendingNotificationAction({
        ...options,
        pendingIntent: ALERT_INTENT,
        now: NOW,
      }),
      { type: 'wait' }
    );
  }
});

test('authenticated background tap resolves an app-constructed alert target', () => {
  assert.deepEqual(
    resolvePendingNotificationAction({
      authChecked: true,
      navigationReady: true,
      isAuthenticated: true,
      pendingIntent: ALERT_INTENT,
      now: NOW,
    }),
    {
      type: 'navigate-alert',
      alertId: 42,
      eventId: EVENT_ID,
      severity: 'HIGH',
      triggerType: 'TEST',
      isTest: true,
    }
  );
});

test('cold-start provider tap resolves only after auth and router readiness', () => {
  assert.deepEqual(
    resolvePendingNotificationAction({
      authChecked: true,
      navigationReady: true,
      isAuthenticated: true,
      pendingIntent: TEST_INTENT,
      now: NOW,
    }),
    {
      type: 'navigate-provider-test',
      testId: 'safe-test-id',
      receivedAt: RECEIVED_AT,
    }
  );
});

test('stored intents reject unknown keys, conflicts, malformed IDs, and staleness', () => {
  assert.deepEqual(parseStoredNotificationIntent(ALERT_INTENT, NOW), ALERT_INTENT);
  for (const invalid of [
    { ...ALERT_INTENT, route: '/arbitrary' },
    { ...ALERT_INTENT, alertId: 0 },
    { ...ALERT_INTENT, eventId: 'invalid' },
    { ...ALERT_INTENT, triggerType: 'KEYWORD' },
    { ...ALERT_INTENT, severity: 'high' },
    { type: 'classroom_alert', alertId: 42 },
    { ...TEST_INTENT, testId: '' },
  ]) {
    assert.equal(parseStoredNotificationIntent(invalid, NOW), null);
  }
  assert.equal(
    parseStoredNotificationIntent(
      ALERT_INTENT,
      NOW + MAX_PENDING_NOTIFICATION_AGE_MS + 1
    ),
    null
  );
  assert.deepEqual(
    resolvePendingNotificationAction({
      authChecked: true,
      navigationReady: true,
      isAuthenticated: true,
      pendingIntent: ALERT_INTENT,
      now: NOW + MAX_PENDING_NOTIFICATION_AGE_MS + 1,
    }),
    { type: 'none' }
  );
});

test('provider test display IDs are masked', () => {
  assert.equal(maskProviderTestId('safe-test-id'), 'sa••••id');
  assert.equal(maskProviderTestId('abc'), '••••');
  assert.equal(maskProviderTestId('invalid value'), 'Unavailable');
});
