import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SCHOOL_INACTIVE_MESSAGE,
  bearerToken,
  classifyAuthFailure,
  handleAuthFailure,
  parseLoginResponse,
  parseUser,
  restoreSessionWith,
} from '../lib/session.ts';

const USER = {
  id: 7,
  email: 'teacher@example.test',
  role: 'staff',
  school_id: '6f1c6a8e-0000-4000-8000-000000000001',
  is_super_admin: false,
  must_change_password: true,
};

test('the full user is kept, not only the token', () => {
  assert.deepEqual(parseUser(USER), {
    id: '7',
    email: 'teacher@example.test',
    role: 'staff',
    school_id: '6f1c6a8e-0000-4000-8000-000000000001',
    is_super_admin: false,
    must_change_password: true,
  });
  assert.deepEqual(
    parseUser({ id: '37', email: 'a@b.c', role: 'admin', is_super_admin: true }),
    {
      id: '37',
      email: 'a@b.c',
      role: 'admin',
      school_id: null,
      is_super_admin: true,
      must_change_password: false,
    }
  );
  assert.equal(parseUser(null), null);
  assert.equal(parseUser({ email: 'a@b.c', role: 'staff' }), null);
  // Only a real boolean true grants super admin.
  assert.equal(parseUser({ ...USER, is_super_admin: 'true' }).is_super_admin, false);
});

test('must_change_password is read from the top level or from user', () => {
  const top = parseLoginResponse({
    access_token: 'token-a',
    must_change_password: true,
    user: { ...USER, must_change_password: false },
  });
  assert.equal(top.user.must_change_password, true);
  const nested = parseLoginResponse({ access_token: 'token-a', user: USER });
  assert.equal(nested.user.must_change_password, true);
  assert.equal(nested.token, 'token-a');
  const neither = parseLoginResponse({
    access_token: 'token-a',
    must_change_password: false,
    user: { ...USER, must_change_password: false },
  });
  assert.equal(neither.user.must_change_password, false);
  assert.equal(parseLoginResponse({ user: USER }), null);
  assert.equal(parseLoginResponse({ access_token: '', user: USER }), null);
});

test('403 details are matched exactly', () => {
  assert.equal(classifyAuthFailure(401, 'Invalid token'), 'session-invalid');
  assert.equal(classifyAuthFailure(403, 'school_inactive'), 'school-inactive');
  assert.equal(
    classifyAuthFailure(403, 'password_change_required'),
    'password-change-required'
  );
  for (const detail of ['Super-admin access required', 'School access denied', 'school_inactive ', undefined]) {
    assert.equal(classifyAuthFailure(403, detail), 'none');
  }
  assert.equal(classifyAuthFailure(500, 'school_inactive'), 'none');
  assert.equal(classifyAuthFailure(null, undefined), 'none');
});

test('bearer tokens are read from the request header', () => {
  assert.equal(bearerToken('Bearer abc'), 'abc');
  assert.equal(bearerToken('Basic abc'), null);
  assert.equal(bearerToken(undefined), null);
});

function failureDependencies(currentToken = 'token-a') {
  const calls = [];
  return {
    calls,
    values: {
      getToken: async () => currentToken,
      signOut: async (reason) => calls.push(['sign-out', reason]),
      clearLocalPushRegistration: async () => calls.push(['clear-local-push']),
      onPasswordChangeRequired: () => calls.push(['password-change-required']),
    },
  };
}

test('school_inactive signs out, clears the push token and keeps the reason for the notice', async () => {
  const { calls, values } = failureDependencies();
  await handleAuthFailure('school-inactive', 'token-a', values);
  assert.deepEqual(calls, [['clear-local-push'], ['sign-out', 'school_inactive']]);
  assert.equal(
    SCHOOL_INACTIVE_MESSAGE,
    'Your school has been deactivated. Contact your administrator.'
  );
});

test('a push-cleanup failure cannot keep a deactivated school signed in', async () => {
  const { calls, values } = failureDependencies();
  values.clearLocalPushRegistration = async () => {
    throw new Error('storage unavailable');
  };
  await handleAuthFailure('school-inactive', 'token-a', values);
  assert.deepEqual(calls, [['sign-out', 'school_inactive']]);
});

test('password_change_required opens the change screen without signing out', async () => {
  const { calls, values } = failureDependencies();
  await handleAuthFailure('password-change-required', 'token-a', values);
  assert.deepEqual(calls, [['password-change-required']]);
});

test('a 401 for the current token signs out as expired', async () => {
  const { calls, values } = failureDependencies();
  await handleAuthFailure('session-invalid', 'token-a', values);
  assert.deepEqual(calls, [['sign-out', 'session_expired']]);
});

test('stale-token protection: a late error for an older token changes nothing', async () => {
  for (const failure of ['session-invalid', 'school-inactive', 'password-change-required']) {
    const { calls, values } = failureDependencies('token-new');
    await handleAuthFailure(failure, 'token-old', values);
    assert.deepEqual(calls, [], failure);
  }
  const { calls, values } = failureDependencies(null);
  await handleAuthFailure('session-invalid', 'token-old', values);
  assert.deepEqual(calls, []);
});

test('errors without a token or with another status are ignored', async () => {
  const { calls, values } = failureDependencies();
  await handleAuthFailure('none', 'token-a', values);
  await handleAuthFailure('session-invalid', null, values);
  assert.deepEqual(calls, []);
});

function httpError(status, detail) {
  return Object.assign(new Error(`HTTP ${status}`), { status, detail });
}

function restoreDependencies(overrides = {}) {
  const calls = [];
  let token = 'token-a';
  const values = {
    getToken: async () => token,
    isTokenUsable: () => true,
    fetchMe: async () => ({ ...USER, must_change_password: false }),
    getStatus: (caught) => caught?.status ?? null,
    getDetail: (caught) => caught?.detail,
    getStoredUser: async () => null,
    storeUser: async (user) => calls.push(['store', user.id]),
    decodeUser: () => ({ ...parseUser(USER), must_change_password: false }),
    signOut: async (reason) => {
      token = null;
      calls.push(['sign-out', reason]);
    },
    clearLocalPushRegistration: async () => calls.push(['clear-local-push']),
    setToken: (value) => {
      token = value;
    },
    ...overrides,
  };
  return { calls, values };
}

test('restore keeps the full /auth/me user, including must_change_password', async () => {
  const { calls, values } = restoreDependencies({
    fetchMe: async () => USER,
  });
  const result = await restoreSessionWith(values);
  assert.equal(result.user.must_change_password, true);
  assert.equal(result.user.school_id, USER.school_id);
  assert.deepEqual(calls, [['store', '7']]);
});

test('restore signs out on school_inactive and reports why', async () => {
  const { calls, values } = restoreDependencies({
    fetchMe: async () => {
      throw httpError(403, 'school_inactive');
    },
  });
  const result = await restoreSessionWith(values);
  assert.deepEqual(result, { user: null, reason: 'school_inactive' });
  assert.deepEqual(calls, [['clear-local-push'], ['sign-out', 'school_inactive']]);
});

test('restore keeps a newer session when the school_inactive answer is stale', async () => {
  const { calls, values } = restoreDependencies();
  values.fetchMe = async () => {
    values.setToken('token-new');
    throw httpError(403, 'school_inactive');
  };
  const result = await restoreSessionWith(values);
  assert.equal(result.user, null);
  assert.deepEqual(calls, []);
});

test('restore keeps a newer session when the 401 is stale', async () => {
  const { calls, values } = restoreDependencies();
  values.fetchMe = async () => {
    values.setToken('token-new');
    throw httpError(401, 'Invalid token');
  };
  await restoreSessionWith(values);
  assert.deepEqual(calls, []);
});

test('restore uses the stored user during an outage', async () => {
  const stored = { ...parseUser(USER), is_super_admin: false };
  const { calls, values } = restoreDependencies({
    fetchMe: async () => {
      throw new Error('Network Error');
    },
    getStoredUser: async () => stored,
  });
  const result = await restoreSessionWith(values);
  assert.deepEqual(result.user, stored);
  assert.deepEqual(calls, []);
});

test('restore ignores a stored user that belongs to another account', async () => {
  const { values } = restoreDependencies({
    fetchMe: async () => {
      throw new Error('Network Error');
    },
    getStoredUser: async () => ({ ...parseUser(USER), id: '99' }),
  });
  const result = await restoreSessionWith(values);
  assert.equal(result.user.id, '7');
});

test('restore signs out an expired token without calling the server', async () => {
  let fetched = false;
  const { calls, values } = restoreDependencies({
    isTokenUsable: () => false,
    fetchMe: async () => {
      fetched = true;
    },
  });
  const result = await restoreSessionWith(values);
  assert.deepEqual(result, { user: null, reason: 'session_expired' });
  assert.equal(fetched, false);
  assert.deepEqual(calls, [['sign-out', 'session_expired']]);
});
