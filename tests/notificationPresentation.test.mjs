import assert from 'node:assert/strict';
import test from 'node:test';
import { getForegroundNotificationBehavior } from '../lib/notificationPresentation.ts';

const classroom = (severity, isTest = false) => ({
  type: 'classroom_alert',
  alertId: 42,
  eventId: '123e4567-e89b-42d3-a456-426614174000',
  severity,
  severityLevel: severity.toUpperCase(),
  triggerType: isTest ? 'TEST' : 'KEYWORD',
  isTest,
});

test('foreground LOW, MEDIUM, HIGH, and finalized alert TEST are audible', () => {
  for (const notification of [
    classroom('low'),
    classroom('medium'),
    classroom('high'),
    classroom('low', true),
  ]) {
    assert.deepEqual(getForegroundNotificationBehavior(notification, true), {
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    });
  }
});

test('provider-only controlled test is audible in the foreground', () => {
  const behavior = getForegroundNotificationBehavior(
    {
      type: 'provider_test',
      testId: 'safe-test-id',
      route: '/notifications/test',
      severity: 'low',
      isTest: true,
    },
    true
  );
  assert.equal(behavior.shouldPlaySound, true);
  assert.equal(behavior.shouldShowBanner, true);
});

test('malformed or duplicate notifications fail closed without sound', () => {
  for (const [notification, shouldPresent] of [
    [null, true],
    [classroom('high'), false],
  ]) {
    const behavior = getForegroundNotificationBehavior(
      notification,
      shouldPresent
    );
    assert.equal(behavior.shouldPlaySound, false);
    assert.equal(behavior.shouldShowAlert, false);
    assert.equal(behavior.shouldSetBadge, false);
  }
});
