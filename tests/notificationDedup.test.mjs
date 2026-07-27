import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractAlertId,
  NotificationDeduper,
} from '../lib/notificationDedup.ts';

test('alert IDs are read from current common payload keys', () => {
  assert.equal(extractAlertId({ alertId: 12 }), '12');
  assert.equal(extractAlertId({ alert_id: ' 14 ' }), '14');
  assert.equal(extractAlertId({ id: 15 }), null);
  assert.equal(extractAlertId({ alertId: '' }), null);
});

test('duplicate notifications for one alert ID are ignored within the window', () => {
  const deduper = new NotificationDeduper(1000);
  assert.equal(deduper.shouldHandle('42', 1000), true);
  assert.equal(deduper.shouldHandle('42', 1500), false);
  assert.equal(deduper.shouldHandle('43', 1500), true);
});

test('the same alert can be handled after the deduplication window', () => {
  const deduper = new NotificationDeduper(1000);
  assert.equal(deduper.shouldHandle('42', 1000), true);
  assert.equal(deduper.shouldHandle('42', 2001), true);
});

test('payloads without alert IDs remain deliverable', () => {
  const deduper = new NotificationDeduper();
  assert.equal(deduper.shouldHandle(null, 1000), true);
  assert.equal(deduper.shouldHandle(null, 1001), true);
});
