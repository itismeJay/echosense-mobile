import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPendingNotificationIntent,
  maskProviderTestId,
  parseStoredNotificationIntent,
  resolvePendingNotificationAction,
} from '../lib/notificationNavigation.ts';

const RECEIVED_AT = '2026-07-30T12:00:00.000Z';
const ALERT_INTENT = { type: 'classroom_alert', alertId: '42' };
const TEST_INTENT = {
  type: 'provider_test',
  testId: 'safe-test-id',
  receivedAt: RECEIVED_AT,
};

test('notification data creates only type-specific safe intents', () => {
  assert.deepEqual(
    createPendingNotificationIntent(
      {
        type: 'classroom_alert',
        alertId: '42',
        eventId: null,
        severity: 'high',
      },
      RECEIVED_AT
    ),
    ALERT_INTENT
  );
  assert.deepEqual(
    createPendingNotificationIntent(
      {
        type: 'provider_test',
        testId: 'safe-test-id',
        route: '/notifications/test',
        severity: 'low',
        isTest: true,
      },
      RECEIVED_AT
    ),
    TEST_INTENT
  );
});

test('unauthenticated notification targets wait without exposing a route', () => {
  for (const pendingIntent of [ALERT_INTENT, TEST_INTENT]) {
    assert.deepEqual(
      resolvePendingNotificationAction({
        authChecked: true,
        navigationReady: true,
        isAuthenticated: false,
        pendingIntent,
      }),
      { type: 'wait' }
    );
  }
});

test('authenticated classroom and provider targets resolve separately', () => {
  assert.deepEqual(
    resolvePendingNotificationAction({
      authChecked: true,
      navigationReady: true,
      isAuthenticated: true,
      pendingIntent: ALERT_INTENT,
    }),
    { type: 'navigate-alert', alertId: '42' }
  );
  assert.deepEqual(
    resolvePendingNotificationAction({
      authChecked: true,
      navigationReady: true,
      isAuthenticated: true,
      pendingIntent: TEST_INTENT,
    }),
    {
      type: 'navigate-provider-test',
      testId: 'safe-test-id',
      receivedAt: RECEIVED_AT,
    }
  );
});

test('cold-start targets wait for router and authentication restoration', () => {
  assert.deepEqual(
    resolvePendingNotificationAction({
      authChecked: false,
      navigationReady: false,
      isAuthenticated: false,
      pendingIntent: TEST_INTENT,
    }),
    { type: 'wait' }
  );
  assert.deepEqual(
    resolvePendingNotificationAction({
      authChecked: true,
      navigationReady: false,
      isAuthenticated: true,
      pendingIntent: TEST_INTENT,
    }),
    { type: 'wait' }
  );
});

test('missing or malformed stored targets never navigate', () => {
  assert.deepEqual(
    resolvePendingNotificationAction({
      authChecked: true,
      navigationReady: true,
      isAuthenticated: true,
      pendingIntent: null,
    }),
    { type: 'none' }
  );
  for (const invalid of [
    { type: 'provider_test', route: '/arbitrary' },
    { type: 'provider_test', testId: '', receivedAt: RECEIVED_AT },
    { type: 'provider_test', testId: 'safe', receivedAt: 'invalid' },
    {
      type: 'provider_test',
      testId: 'safe',
      receivedAt: RECEIVED_AT,
      route: '/arbitrary',
    },
    { type: 'classroom_alert', alertId: '0' },
    { type: 'unsupported', testId: 'safe' },
  ]) {
    assert.equal(parseStoredNotificationIntent(invalid), null);
  }
});

test('stored test intent round-trips and its display ID is masked', () => {
  assert.deepEqual(parseStoredNotificationIntent(TEST_INTENT), TEST_INTENT);
  assert.equal(maskProviderTestId('safe-test-id'), 'sa••••id');
  assert.equal(maskProviderTestId('abc'), '••••');
  assert.equal(maskProviderTestId('invalid value'), 'Unavailable');
});
