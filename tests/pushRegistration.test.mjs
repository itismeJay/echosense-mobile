import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPushRegistrationLifecycle,
  isExpoPushToken,
  runPushRegistration,
} from '../lib/pushRegistration.ts';

const FAKE_TOKEN = 'ExpoPushToken[synthetic-test-token]';

function dependencies(overrides = {}) {
  const calls = {
    permissionChecks: 0,
    permissionRequests: 0,
    tokenRequests: 0,
    registrations: [],
    stored: [],
  };
  const values = {
    userId: 'synthetic-user-42',
    isPhysicalDevice: true,
    isSupportedBuild: true,
    getPermissionStatus: async () => {
      calls.permissionChecks += 1;
      return 'granted';
    },
    requestPermission: async () => {
      calls.permissionRequests += 1;
      return 'granted';
    },
    getPushToken: async () => {
      calls.tokenRequests += 1;
      return FAKE_TOKEN;
    },
    getStoredRegistration: async () => null,
    registerToken: async (token) => {
      calls.registrations.push(token);
    },
    storeRegistration: async (registration) => {
      calls.stored.push(registration);
    },
    ...overrides,
  };
  return { calls, values };
}

test('already-granted permission is not requested again', async () => {
  const { calls, values } = dependencies();
  const result = await runPushRegistration(values);
  assert.equal(result.status, 'registered');
  assert.equal(calls.permissionChecks, 1);
  assert.equal(calls.permissionRequests, 0);
});
test('undetermined permission is requested once', async () => {
  const { calls, values } = dependencies({
    getPermissionStatus: async () => 'undetermined',
  });
  const result = await runPushRegistration(values);
  assert.equal(result.status, 'registered');
  assert.equal(calls.permissionRequests, 1);
});

test('denied permission skips token generation and registration', async () => {
  const { calls, values } = dependencies({
    getPermissionStatus: async () => 'denied',
  });
  const result = await runPushRegistration(values);
  assert.equal(result.status, 'permission-denied');
  assert.equal(calls.permissionRequests, 0);
  assert.equal(calls.tokenRequests, 0);
  assert.deepEqual(calls.registrations, []);
});

test('simulators and unsupported Expo Go builds fail safely', async () => {
  const simulator = dependencies({ isPhysicalDevice: false });
  const expoGo = dependencies({ isSupportedBuild: false });
  assert.equal(
    (await runPushRegistration(simulator.values)).status,
    'physical-device-required'
  );
  assert.equal(
    (await runPushRegistration(expoGo.values)).status,
    'unsupported-build'
  );
  assert.equal(simulator.calls.permissionChecks, 0);
  assert.equal(expoGo.calls.permissionChecks, 0);
});

test('logged-out registration never requests or sends a token', async () => {
  const { calls, values } = dependencies({ userId: null });
  const result = await runPushRegistration(values);
  assert.equal(result.status, 'not-authenticated');
  assert.equal(calls.permissionChecks, 0);
  assert.deepEqual(calls.registrations, []);
});

test('generated fake Expo token is registered and associated with user cache', async () => {
  const { calls, values } = dependencies();
  const result = await runPushRegistration(values);
  assert.deepEqual(result, { status: 'registered', token: FAKE_TOKEN });
  assert.deepEqual(calls.registrations, [FAKE_TOKEN]);
  assert.deepEqual(calls.stored, [
    { userId: 'synthetic-user-42', token: FAKE_TOKEN },
  ]);
});

test('same user and token are not registered twice', async () => {
  const { calls, values } = dependencies({
    getStoredRegistration: async () => ({
      userId: 'synthetic-user-42',
      token: FAKE_TOKEN,
    }),
  });
  const result = await runPushRegistration(values);
  assert.equal(result.status, 'already-registered');
  assert.deepEqual(calls.registrations, []);
});

test('a token cached for another user is registered to the authenticated user', async () => {
  const { calls, values } = dependencies({
    getStoredRegistration: async () => ({
      userId: 'different-synthetic-user',
      token: FAKE_TOKEN,
    }),
  });
  const result = await runPushRegistration(values);
  assert.equal(result.status, 'registered');
  assert.deepEqual(calls.registrations, [FAKE_TOKEN]);
  assert.deepEqual(calls.stored[0], {
    userId: 'synthetic-user-42',
    token: FAKE_TOKEN,
  });
});

test('token and backend failures are returned without crashing', async () => {
  const tokenFailure = dependencies({
    getPushToken: async () => {
      throw new Error('synthetic token failure');
    },
  });
  const apiFailure = dependencies({
    registerToken: async () => {
      throw new Error('synthetic API failure');
    },
  });
  assert.equal(
    (await runPushRegistration(tokenFailure.values)).status,
    'token-unavailable'
  );
  assert.equal(
    (await runPushRegistration(apiFailure.values)).status,
    'registration-failed'
  );
});

test('permission query and request failures are returned separately', async () => {
  const queryFailure = dependencies({
    getPermissionStatus: async () => {
      throw new Error('synthetic permission query failure');
    },
  });
  const requestFailure = dependencies({
    getPermissionStatus: async () => 'undetermined',
    requestPermission: async () => {
      throw new Error('synthetic permission request failure');
    },
  });
  assert.equal(
    (await runPushRegistration(queryFailure.values)).status,
    'permission-query-failed'
  );
  assert.equal(
    (await runPushRegistration(requestFailure.values)).status,
    'permission-request-failed'
  );
});

test('SecureStore read and write failures do not escape registration', async () => {
  const readFailure = dependencies({
    getStoredRegistration: async () => {
      throw new Error('synthetic secure read failure');
    },
  });
  const writeFailure = dependencies({
    storeRegistration: async () => {
      throw new Error('synthetic secure write failure');
    },
  });
  assert.equal(
    (await runPushRegistration(readFailure.values)).status,
    'storage-unavailable'
  );
  assert.equal(
    (await runPushRegistration(writeFailure.values)).status,
    'storage-unavailable'
  );
});

test('only valid Expo push-token formats are accepted', async () => {
  assert.equal(isExpoPushToken(FAKE_TOKEN), true);
  assert.equal(isExpoPushToken('ExponentPushToken[synthetic]'), true);
  assert.equal(isExpoPushToken('synthetic-not-a-provider-token'), false);
  const invalid = dependencies({
    getPushToken: async () => 'synthetic-not-a-provider-token',
  });
  assert.equal(
    (await runPushRegistration(invalid.values)).status,
    'token-unavailable'
  );
  assert.deepEqual(invalid.calls.registrations, []);
});

test('token changes and app foreground retry registration with cleanup', async () => {
  const state = {
    syncs: 0,
    tokenListener: null,
    appStateListener: null,
    tokenRemoves: 0,
    appStateRemoves: 0,
  };
  const lifecycle = createPushRegistrationLifecycle({
    syncRegistration: async () => {
      state.syncs += 1;
      return { status: 'registered', token: FAKE_TOKEN };
    },
    addPushTokenChangeListener(listener) {
      state.tokenListener = listener;
      return { remove: () => (state.tokenRemoves += 1) };
    },
    addAppStateChangeListener(listener) {
      state.appStateListener = listener;
      return { remove: () => (state.appStateRemoves += 1) };
    },
  });
  const stop = lifecycle.start();
  state.tokenListener();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(state.syncs, 1);
  state.appStateListener('background');
  assert.equal(state.syncs, 1);
  state.appStateListener('active');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(state.syncs, 2);
  stop();
  assert.equal(state.tokenRemoves, 1);
  assert.equal(state.appStateRemoves, 1);
  assert.equal(lifecycle.isActive(), false);
});
