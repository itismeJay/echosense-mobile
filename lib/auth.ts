import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { getServerUrl } from './server';
import {
  parseLoginResponse,
  parseUser,
  restoreSessionWith,
  type RestoreResult,
  type SignOutReason,
  type User,
} from './session.ts';

export type { SignOutReason, User } from './session.ts';

const TOKEN_KEY = 'echosense_token';
const USER_KEY = 'echosense_user_v1';

export type SessionEvent =
  | { type: 'signed-out'; reason: SignOutReason }
  | { type: 'password-change-required' };

const sessionListeners = new Set<(event: SessionEvent) => void>();
let localPushCleaner: () => Promise<void> = async () => {};

function emit(event: SessionEvent): void {
  for (const listener of sessionListeners) listener(event);
}

/**
 * notifications.ts registers its local cleanup here. auth.ts cannot import it
 * directly without an import cycle through api.ts.
 */
export function setLocalPushCleaner(cleaner: () => Promise<void>): void {
  localPushCleaner = cleaner;
}

export function clearLocalPushRegistration(): Promise<void> {
  return localPushCleaner();
}

export function wakeup(): void {
  axios.get(`${getServerUrl()}/health`, { timeout: 90_000 }).catch(() => {});
}

export async function login(email: string, password: string): Promise<User> {
  const { data } = await axios.post<unknown>(
    `${getServerUrl()}/auth/login`,
    { email, password },
    { headers: { 'Content-Type': 'application/json' }, timeout: 90_000 }
  );
  const session = parseLoginResponse(data);
  if (!session) throw new Error('Invalid sign-in response');
  await SecureStore.setItemAsync(TOKEN_KEY, session.token);
  await storeUser(session.user);
  return session.user;
}

export async function logout(reason: SignOutReason = 'signed_out'): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
  emit({ type: 'signed-out', reason });
}

export function notifyPasswordChangeRequired(): void {
  emit({ type: 'password-change-required' });
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function storeUser(user: User): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

async function getStoredUser(): Promise<User | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return parseUser(JSON.parse(raw));
  } catch {
    return null;
  }
}

function decodeTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded: unknown = JSON.parse(atob(padded));
    return typeof decoded === 'object' && decoded !== null
      ? (decoded as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function isTokenUsable(token: string): boolean {
  const payload = decodeTokenPayload(token);
  return typeof payload?.exp === 'number' && payload.exp * 1000 > Date.now();
}

/** Only used when the server is unreachable and no user was stored. */
export function getUser(token: string): User | null {
  const payload = decodeTokenPayload(token);
  if (!payload || !isTokenUsable(token)) return null;
  return {
    id: String(payload.sub ?? payload.id ?? ''),
    email: typeof payload.email === 'string' ? payload.email : '',
    role: typeof payload.role === 'string' ? payload.role : '',
    school_id: null,
    is_super_admin: false,
    must_change_password: false,
  };
}

export async function fetchCurrentUser(token?: string): Promise<User> {
  const authToken = token ?? (await getToken());
  if (!authToken) throw new Error('Authentication required');
  const { data } = await axios.get<unknown>(`${getServerUrl()}/auth/me`, {
    headers: { Authorization: `Bearer ${authToken}` },
    timeout: 20_000,
  });
  const user = parseUser(data);
  if (!user) throw new Error('Invalid /auth/me response');
  await storeUser(user);
  return user;
}

export async function restoreSession(): Promise<RestoreResult> {
  return restoreSessionWith({
    getToken,
    isTokenUsable,
    fetchMe: async (token) =>
      (
        await axios.get<unknown>(`${getServerUrl()}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20_000,
        })
      ).data,
    getStatus: (caught) =>
      axios.isAxiosError(caught) ? caught.response?.status ?? null : null,
    getDetail: (caught) =>
      axios.isAxiosError(caught)
        ? (caught.response?.data as { detail?: unknown } | undefined)?.detail
        : undefined,
    getStoredUser,
    storeUser,
    decodeUser: getUser,
    signOut: logout,
    clearLocalPushRegistration,
  });
}

export function subscribeToSessionEvents(
  listener: (event: SessionEvent) => void
): () => void {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}
