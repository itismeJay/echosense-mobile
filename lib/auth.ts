import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_BASE_URL } from './constants';

const TOKEN_KEY = 'echosense_token';
const sessionInvalidationListeners = new Set<() => void>();

export interface User {
  id: string;
  email: string;
  role: string;
}

export function wakeup(): void {
  axios.get(`${API_BASE_URL}/health`, { timeout: 90_000 }).catch(() => {});
}

export async function login(email: string, password: string): Promise<User> {
  const { data } = await axios.post<{ access_token: string; user: User }>(
    `${API_BASE_URL}/auth/login`,
    { email, password },
    { headers: { 'Content-Type': 'application/json' }, timeout: 90_000 }
  );
  await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
  return data.user;
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  for (const listener of sessionInvalidationListeners) listener();
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export function getUser(token: string): User | null {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded));
    if (
      typeof decoded.exp !== 'number' ||
      decoded.exp * 1000 <= Date.now()
    ) {
      return null;
    }
    return {
      id: String(decoded.sub ?? decoded.id ?? ''),
      email: decoded.email ?? '',
      role: decoded.role ?? '',
    };
  } catch {
    return null;
  }
}

export async function restoreSession(): Promise<User | null> {
  const token = await getToken();
  if (!token) return null;

  const decodedUser = getUser(token);
  if (!decodedUser) {
    await logout();
    return null;
  }

  try {
    const { data } = await axios.get<User>(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 20_000,
    });
    return data;
  } catch (caught: unknown) {
    const status =
      axios.isAxiosError(caught) ? caught.response?.status : undefined;
    if (status === 401 || status === 403) {
      // A slow startup validation can finish after the user signs in again.
      // Never let that stale response delete the newer session token.
      const currentToken = await getToken();
      if (currentToken === token) {
        await logout();
      }
      return null;
    }
    // A valid, unexpired stored session remains usable during a transient outage.
    return decodedUser;
  }
}

export function subscribeToSessionInvalidation(
  listener: () => void
): () => void {
  sessionInvalidationListeners.add(listener);
  return () => sessionInvalidationListeners.delete(listener);
}
