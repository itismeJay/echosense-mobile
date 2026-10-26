export interface User {
  id: string;
  email: string;
  role: string;
  school_id: string | null;
  is_super_admin: boolean;
  must_change_password: boolean;
}

export type SignOutReason = 'school_inactive' | 'session_expired' | 'signed_out';

export const SCHOOL_INACTIVE_MESSAGE =
  'Your school has been deactivated. Contact your administrator.';

export type AuthFailure =
  | 'session-invalid'
  | 'school-inactive'
  | 'password-change-required'
  | 'none';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parse a UserOut from /auth/login or /auth/me. Returns null when unusable. */
export function parseUser(value: unknown): User | null {
  if (!isRecord(value)) return null;
  const id =
    typeof value.id === 'string' || typeof value.id === 'number'
      ? String(value.id)
      : '';
  if (!id || typeof value.email !== 'string' || typeof value.role !== 'string') {
    return null;
  }
  return {
    id,
    email: value.email,
    role: value.role,
    school_id: typeof value.school_id === 'string' ? value.school_id : null,
    is_super_admin: value.is_super_admin === true,
    must_change_password: value.must_change_password === true,
  };
}

/** The flag can arrive at the top level, inside `user`, or both. */
export function parseLoginResponse(
  value: unknown
): { token: string; user: User } | null {
  if (!isRecord(value) || typeof value.access_token !== 'string') return null;
  const user = parseUser(value.user);
  if (!value.access_token || !user) return null;
  return {
    token: value.access_token,
    user: {
      ...user,
      must_change_password:
        user.must_change_password || value.must_change_password === true,
    },
  };
}

export function classifyAuthFailure(
  status: number | null | undefined,
  detail: unknown
): AuthFailure {
  if (status === 401) return 'session-invalid';
  if (status === 403 && detail === 'school_inactive') return 'school-inactive';
  if (status === 403 && detail === 'password_change_required') {
    return 'password-change-required';
  }
  return 'none';
}

export function bearerToken(authorization: unknown): string | null {
  return typeof authorization === 'string' &&
    authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null;
}

export interface AuthFailureDependencies {
  getToken: () => Promise<string | null>;
  signOut: (reason: SignOutReason) => Promise<void>;
  clearLocalPushRegistration: () => Promise<void>;
  onPasswordChangeRequired: () => void;
}

/**
 * React to an API error. A response to a request made with an older token is
 * ignored, so it can never end a session created while it was in flight.
 */
export async function handleAuthFailure(
  failure: AuthFailure,
  failedToken: string | null,
  dependencies: AuthFailureDependencies
): Promise<void> {
  if (failure === 'none' || !failedToken) return;
  const currentToken = await dependencies.getToken();
  if (currentToken !== failedToken) return;

  if (failure === 'password-change-required') {
    dependencies.onPasswordChangeRequired();
    return;
  }
  if (failure === 'school-inactive') {
    // The backend rejects every call for this account now, so the token can
    // only be forgotten locally. The next sign-in registers again.
    await dependencies.clearLocalPushRegistration().catch(() => {});
    await dependencies.signOut('school_inactive');
    return;
  }
  await dependencies.signOut('session_expired');
}

export type RestoreResult =
  | { user: User; reason?: undefined }
  | { user: null; reason?: SignOutReason };

export interface RestoreDependencies {
  getToken: () => Promise<string | null>;
  isTokenUsable: (token: string) => boolean;
  fetchMe: (token: string) => Promise<unknown>;
  getStatus: (caught: unknown) => number | null;
  getDetail: (caught: unknown) => unknown;
  getStoredUser: () => Promise<User | null>;
  storeUser: (user: User) => Promise<void>;
  /** Fallback when the server is unreachable and nothing was stored. */
  decodeUser: (token: string) => User | null;
  signOut: (reason: SignOutReason) => Promise<void>;
  clearLocalPushRegistration: () => Promise<void>;
}

export async function restoreSessionWith(
  dependencies: RestoreDependencies
): Promise<RestoreResult> {
  const token = await dependencies.getToken();
  if (!token) return { user: null };
  if (!dependencies.isTokenUsable(token)) {
    await dependencies.signOut('session_expired');
    return { user: null, reason: 'session_expired' };
  }

  try {
    const user = parseUser(await dependencies.fetchMe(token));
    if (!user) throw new Error('Invalid /auth/me response');
    await dependencies.storeUser(user).catch(() => {});
    return { user };
  } catch (caught: unknown) {
    const failure = classifyAuthFailure(
      dependencies.getStatus(caught),
      dependencies.getDetail(caught)
    );
    if (failure === 'session-invalid' || failure === 'school-inactive') {
      const reason: SignOutReason =
        failure === 'school-inactive' ? 'school_inactive' : 'session_expired';
      // A slow startup check can finish after the user signs in again.
      // Never let that stale response delete the newer session.
      if ((await dependencies.getToken()) === token) {
        if (failure === 'school-inactive') {
          await dependencies.clearLocalPushRegistration().catch(() => {});
        }
        await dependencies.signOut(reason);
      }
      return { user: null, reason };
    }
    // A valid, unexpired stored session stays usable during an outage.
    const stored = await dependencies.getStoredUser().catch(() => null);
    const decoded = dependencies.decodeUser(token);
    if (stored && (!decoded || stored.id === decoded.id)) return { user: stored };
    return decoded ? { user: decoded } : { user: null };
  }
}
