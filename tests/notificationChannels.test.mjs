import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ANDROID_ALERT_CHANNEL_ID,
  ANDROID_HIGH_ALERT_CHANNEL_ID,
  ANDROID_NOTIFICATION_CHANNELS,
  getAndroidNotificationChannelId,
} from '../lib/notificationChannels.ts';

test('Android uses two stable responsible notification channels', () => {
  assert.equal(ANDROID_ALERT_CHANNEL_ID, 'echosense-alerts');
  assert.equal(
    ANDROID_HIGH_ALERT_CHANNEL_ID,
    'echosense-high-alerts'
  );
  assert.equal(ANDROID_NOTIFICATION_CHANNELS.length, 2);
  assert.equal(ANDROID_NOTIFICATION_CHANNELS[0].importance, 'default');
  assert.equal(ANDROID_NOTIFICATION_CHANNELS[1].importance, 'high');
  assert.equal(ANDROID_NOTIFICATION_CHANNELS[0].sound, null);
  assert.equal(ANDROID_NOTIFICATION_CHANNELS[1].sound, 'default');
  for (const channel of ANDROID_NOTIFICATION_CHANNELS) {
    assert.match(channel.description, /unverified/i);
    assert.match(channel.description, /human review/i);
    assert.doesNotMatch(channel.description, /emergency|confirmed danger/i);
  }
});

test('provider tests always use the normal channel, never the HIGH channel', () => {
  const providerTest = {
    type: 'provider_test',
    testId: 'safe-test-id',
    route: '/notifications/test',
    severity: 'low',
    isTest: true,
  };
  assert.equal(
    getAndroidNotificationChannelId(providerTest),
    ANDROID_ALERT_CHANNEL_ID
  );
  assert.notEqual(
    getAndroidNotificationChannelId(providerTest),
    ANDROID_HIGH_ALERT_CHANNEL_ID
  );
  assert.equal(
    getAndroidNotificationChannelId({
      type: 'classroom_alert',
      alertId: '42',
      eventId: null,
      severity: 'high',
    }),
    ANDROID_HIGH_ALERT_CHANNEL_ID
  );
});
