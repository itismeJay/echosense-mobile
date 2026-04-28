import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_BASE_URL } from './constants';

const TOKEN_KEY = 'echosense_token';

export interface User {
  id: string;
  email: string;
  role: string;
}

export function wakeup(): void {
  axios.get(`${API_BASE_URL}/alerts`, { timeout: 90_000 }).catch(() => {});
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
    return {
      id: String(decoded.sub ?? decoded.id ?? ''),
      email: decoded.email ?? '',
      role: decoded.role ?? '',
    };
  } catch {
    return null;
  }
}
