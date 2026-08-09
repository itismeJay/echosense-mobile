import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ANDROID_HIGH_ALERT_CHANNEL_ID,
  ANDROID_NOTIFICATION_CHANNELS,
  ANDROID_PHASE3_ALERT_CHANNEL_ID,
  ANDROID_PROVIDER_TEST_CHANNEL_ID,
  getAndroidNotificationChannelId,
} from '../lib/notificationChannels.ts';

const classroom = (severity) => ({
  type: 'classroom_alert',
  alertId: 42,
  eventId: '123e4567-e89b-42d3-a456-426614174000',
  severity,
  severityLevel: severity.toUpperCase(),
  triggerType: 'KEYWORD',
  isTest: false,
});

test('Phase 3 Android channel IDs are exact and separate by purpose', () => {
  assert.equal(ANDROID_PHASE3_ALERT_CHANNEL_ID, 'echosense-phase3-alerts');
  assert.equal(ANDROID_HIGH_ALERT_CHANNEL_ID, 'echosense-high-alerts');
  assert.equal(ANDROID_PROVIDER_TEST_CHANNEL_ID, 'echosense-alerts');
  assert.equal(ANDROID_NOTIFICATION_CHANNELS.length, 3);
});

test('all controlled-test channels request default sound and vibration', () => {
  const byId = Object.fromEntries(
    ANDROID_NOTIFICATION_CHANNELS.map((channel) => [channel.id, channel])
  );
  assert.equal(byId[ANDROID_PHASE3_ALERT_CHANNEL_ID].importance, 'default');
  assert.equal(byId[ANDROID_HIGH_ALERT_CHANNEL_ID].importance, 'high');
  assert.equal(byId[ANDROID_PROVIDER_TEST_CHANNEL_ID].importance, 'default');
  for (const channel of ANDROID_NOTIFICATION_CHANNELS) {
    assert.equal(channel.sound, 'default');
    assert.equal(channel.enableVibrate, true);
    assert.ok(channel.vibrationPattern.length >= 2);
    assert.equal(channel.lockscreenVisibility, 'private');
    assert.doesNotMatch(channel.description, /emergency|confirmed danger/i);
  }
});

test('LOW/MEDIUM, HIGH, and provider tests select their fixed channels', () => {
  assert.equal(
    getAndroidNotificationChannelId(classroom('low')),
    ANDROID_PHASE3_ALERT_CHANNEL_ID
  );
  assert.equal(
    getAndroidNotificationChannelId(classroom('medium')),
    ANDROID_PHASE3_ALERT_CHANNEL_ID
  );
  assert.equal(
    getAndroidNotificationChannelId(classroom('high')),
    ANDROID_HIGH_ALERT_CHANNEL_ID
  );
  assert.equal(
    getAndroidNotificationChannelId({
      type: 'provider_test',
      testId: 'safe-test-id',
      route: '/notifications/test',
      severity: 'low',
      isTest: true,
    }),
    ANDROID_PROVIDER_TEST_CHANNEL_ID
  );
});
