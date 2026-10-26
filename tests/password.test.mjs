import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MIN_PASSWORD_LENGTH,
  completePasswordChange,
  validatePasswordChange,
} from '../lib/password.ts';

const VALID = {
  currentPassword: 'Temporary1!',
  newPassword: 'MyOwnPassword9',
  confirmPassword: 'MyOwnPassword9',
};

const CHANGED_USER = {
  id: '12',
  email: 'teacher@example.test',
  role: 'staff',
  school_id: 'school-1',
  is_super_admin: false,
  must_change_password: false,
};

test('the rules match the backend', () => {
  assert.equal(MIN_PASSWORD_LENGTH, 8);
  assert.equal(validatePasswordChange(VALID), null);
  assert.match(
    validatePasswordChange({ ...VALID, currentPassword: '' }),
    /current password/
  );
  assert.match(
    validatePasswordChange({ ...VALID, newPassword: 'short7!', confirmPassword: 'short7!' }),
    /at least 8 characters/
  );
  assert.equal(
    validatePasswordChange({ ...VALID, newPassword: '12345678', confirmPassword: '12345678' }),
    null
  );
  assert.match(
    validatePasswordChange({ ...VALID, newPassword: VALID.currentPassword, confirmPassword: VALID.currentPassword }),
    /different/
  );
  assert.match(
    validatePasswordChange({ ...VALID, confirmPassword: 'MyOwnPassword8' }),
    /don’t match/
  );
});

test('passwords over 72 bytes are rejected, counting UTF-8 bytes', () => {
  const ascii72 = 'a'.repeat(72);
  assert.equal(
    validatePasswordChange({ ...VALID, newPassword: ascii72, confirmPassword: ascii72 }),
    null
  );
  // 25 three-byte characters are 75 bytes but only 25 characters.
  const wide = '€'.repeat(25);
  assert.match(
    validatePasswordChange({ ...VALID, newPassword: wide, confirmPassword: wide }),
    /too long/
  );
});

function dependencies(overrides = {}) {
  const calls = [];
  return {
    calls,
    values: {
      changePassword: async (current, next) => {
        calls.push(['change', current, next]);
        return CHANGED_USER;
      },
      fetchMe: async () => {
        calls.push(['me']);
        return CHANGED_USER;
      },
      getStatus: (caught) => caught?.status ?? null,
      ...overrides,
    },
  };
}

test('a valid change calls the backend, then refreshes /auth/me', async () => {
  const { calls, values } = dependencies();
  const result = await completePasswordChange(VALID, values);
  assert.deepEqual(result, { ok: true, user: CHANGED_USER });
  assert.deepEqual(calls, [
    ['change', VALID.currentPassword, VALID.newPassword],
    ['me'],
  ]);
});

test('invalid input never reaches the backend', async () => {
  const { calls, values } = dependencies();
  const result = await completePasswordChange(
    { ...VALID, confirmPassword: 'nope' },
    values
  );
  assert.equal(result.ok, false);
  assert.deepEqual(calls, []);
});

test('backend errors become plain messages', async () => {
  for (const [status, pattern] of [
    [400, /current password wasn’t recognized/],
    [422, /can’t be used/],
    [500, /couldn’t change your password/],
    [null, /couldn’t change your password/],
  ]) {
    const { calls, values } = dependencies({
      changePassword: async () => {
        throw Object.assign(new Error('HTTP'), { status });
      },
    });
    const result = await completePasswordChange(VALID, values);
    assert.equal(result.ok, false);
    assert.match(result.error, pattern);
    assert.deepEqual(calls, [], 'no /auth/me after a failed change');
  }
});

test('if /auth/me fails, the change response user is used', async () => {
  const { values } = dependencies({
    fetchMe: async () => {
      throw new Error('Network Error');
    },
  });
  const result = await completePasswordChange(VALID, values);
  assert.deepEqual(result, { ok: true, user: CHANGED_USER });
});

test('the flag is never cleared locally if the server still says it is set', async () => {
  const stillSet = { ...CHANGED_USER, must_change_password: true };
  const { values } = dependencies({
    changePassword: async () => stillSet,
    fetchMe: async () => stillSet,
  });
  const result = await completePasswordChange(VALID, values);
  assert.equal(result.ok, false);
  assert.match(result.error, /Sign in again/);
});
