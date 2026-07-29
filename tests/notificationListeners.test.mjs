import assert from 'node:assert/strict';
import test from 'node:test';
import { createNotificationListenerManager } from '../lib/notificationListeners.ts';

function source() {
  const state = {
    receivedAdds: 0,
    responseAdds: 0,
    receivedRemoves: 0,
    responseRemoves: 0,
    receivedListener: null,
    responseListener: null,
  };
  return {
    state,
    value: {
      addReceivedListener(listener) {
        state.receivedAdds += 1;
        state.receivedListener = listener;
        return { remove: () => (state.receivedRemoves += 1) };
      },
      addResponseListener(listener) {
        state.responseAdds += 1;
        state.responseListener = listener;
        return { remove: () => (state.responseRemoves += 1) };
      },
    },
  };
}

test('foreground and response listeners register exactly once', () => {
  const manager = createNotificationListenerManager();
  const fake = source();
  const stop = manager.start(fake.value, () => {}, () => {});
  const duplicateStop = manager.start(fake.value, () => {}, () => {});
  assert.equal(stop, duplicateStop);
  assert.equal(fake.state.receivedAdds, 1);
  assert.equal(fake.state.responseAdds, 1);
  assert.equal(manager.isActive(), true);
});
test('listener cleanup removes both subscriptions and permits restart', () => {
  const manager = createNotificationListenerManager();
  const fake = source();
  const stop = manager.start(fake.value, () => {}, () => {});
  stop();
  assert.equal(fake.state.receivedRemoves, 1);
  assert.equal(fake.state.responseRemoves, 1);
  assert.equal(manager.isActive(), false);
  manager.start(fake.value, () => {}, () => {});
  assert.equal(fake.state.receivedAdds, 2);
  assert.equal(fake.state.responseAdds, 2);
});

test('foreground notifications and taps reach their intended callbacks', () => {
  const manager = createNotificationListenerManager();
  const fake = source();
  const received = [];
  const responses = [];
  manager.start(
    fake.value,
    (notification) => received.push(notification),
    (response) => responses.push(response)
  );
  fake.state.receivedListener({ synthetic: 'foreground' });
  fake.state.responseListener({ synthetic: 'tap' });
  assert.deepEqual(received, [{ synthetic: 'foreground' }]);
  assert.deepEqual(responses, [{ synthetic: 'tap' }]);
});
