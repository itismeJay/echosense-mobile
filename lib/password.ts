import { parseUser, type User } from './session.ts';

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_BYTES = 72;

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).length;
}

/** The same rules as POST /auth/change-password. Returns an error or null. */
export function validatePasswordChange(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): string | null {
  const { currentPassword, newPassword, confirmPassword } = input;
  if (!currentPassword) return 'Enter your current password.';
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return `Your new password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (utf8Length(newPassword) > MAX_PASSWORD_BYTES) {
    return 'Your new password is too long. Use a shorter one.';
  }
  if (newPassword === currentPassword) {
    return 'Choose a new password that is different from your current one.';
  }
  if (newPassword !== confirmPassword) {
    return 'The new passwords don’t match.';
  }
  return null;
}

export interface PasswordChangeDependencies {
  changePassword: (currentPassword: string, newPassword: string) => Promise<unknown>;
  fetchMe: () => Promise<unknown>;
  getStatus: (caught: unknown) => number | null;
}

export type PasswordChangeResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

/**
 * Change the password, then re-read /auth/me so the app sees the cleared
 * must_change_password flag from the server rather than assuming it.
 */
export async function completePasswordChange(
  input: { currentPassword: string; newPassword: string; confirmPassword: string },
  dependencies: PasswordChangeDependencies
): Promise<PasswordChangeResult> {
  const invalid = validatePasswordChange(input);
  if (invalid) return { ok: false, error: invalid };

  let changed: unknown;
  try {
    changed = await dependencies.changePassword(
      input.currentPassword,
      input.newPassword
    );
  } catch (caught: unknown) {
    const status = dependencies.getStatus(caught);
    return {
      ok: false,
      error:
        status === 400
          ? 'Your current password wasn’t recognized.'
          : status === 422
            ? 'That new password can’t be used. Use at least 8 characters, different from your current one.'
            : 'We couldn’t change your password. Check your connection and try again.',
    };
  }

  try {
    const user = parseUser(await dependencies.fetchMe());
    if (user && !user.must_change_password) return { ok: true, user };
  } catch {
    // The change itself answered with the updated user; use it below.
  }
  const fromChange = parseUser(changed);
  if (fromChange && !fromChange.must_change_password) {
    return { ok: true, user: fromChange };
  }
  return {
    ok: false,
    error:
      'Your password was changed, but EchoSense couldn’t confirm it. Sign in again with your new password.',
  };
}
