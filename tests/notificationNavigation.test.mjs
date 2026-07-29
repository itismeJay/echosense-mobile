import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePendingAlertAction } from '../lib/notificationNavigation.ts';

test('unauthenticated notification target waits without exposing alert data', () => {
  assert.deepEqual(
    resolvePendingAlertAction({
      authChecked: true,
      navigationReady: true,
      isAuthenticated: false,
      pendingAlertId: '42',
    }),
    { type: 'wait' }
  );
});

test('pending target resumes after successful authentication', () => {
  assert.deepEqual(
    resolvePendingAlertAction({
      authChecked: true,
      navigationReady: true,
      isAuthenticated: true,
      pendingAlertId: '42',
    }),
    { type: 'navigate', alertId: '42' }
  );
});

test('cold-start target waits for router and authentication restoration', () => {
  assert.deepEqual(
    resolvePendingAlertAction({
      authChecked: false,
      navigationReady: false,
      isAuthenticated: false,
      pendingAlertId: '42',
    }),
    { type: 'wait' }
  );
  assert.deepEqual(
    resolvePendingAlertAction({
      authChecked: true,
      navigationReady: false,
      isAuthenticated: true,
      pendingAlertId: '42',
    }),
    { type: 'wait' }
  );
});

test('missing targets cause no navigation', () => {
  assert.deepEqual(
    resolvePendingAlertAction({
      authChecked: true,
      navigationReady: true,
      isAuthenticated: true,
      pendingAlertId: null,
    }),
    { type: 'none' }
  );
});
