import axios from 'axios';
import { router } from 'expo-router';
import { API_BASE_URL } from './constants';
import { getToken, logout } from './auth';
import type { Alert, LogStats, Severity } from './types';
import { normalizeSeverity as normalizeAlertSeverity } from './presentation';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await logout();
      router.replace('/login');
    }
    return Promise.reject(error);
  }
);

export async function fetchAlerts(): Promise<Alert[]> {
  const { data } = await client.get<Alert[]>('/alerts');
  return Array.isArray(data) ? data : [];
}

export async function fetchLogs(): Promise<Alert[]> {
  const { data } = await client.get<Alert[]>('/logs');
  return Array.isArray(data) ? data : [];
}

export async function fetchStats(): Promise<LogStats> {
  const { data } = await client.get<LogStats>('/logs/stats');
  return data;
}

export async function fetchAvailableAlert(id: number): Promise<Alert | null> {
  try {
    const { data } = await client.get<Alert>(`/alerts/${id}`);
    return data;
  } catch (caught: unknown) {
    if (axios.isAxiosError(caught) && caught.response?.status === 404) {
      return null;
    }
    throw caught;
  }
}

export async function postAlert(
  payload: Omit<Alert, 'id' | 'created_at'>
): Promise<Alert> {
  const { data } = await client.post<Alert>('/alerts', payload);
  return data;
}

export async function postPushToken(token: string): Promise<void> {
  const authToken = await getToken();
  if (!authToken) throw new Error('Authentication required');
  await client.post('/users/push-token', { token });
}

export async function clearPushToken(): Promise<void> {
  const authToken = await getToken();
  if (!authToken) throw new Error('Authentication required');
  // The current backend stores one nullable string per user and exposes no
  // delete route. An empty value detaches this device and is treated as
  // unavailable by controlled-recipient validation.
  await client.post('/users/push-token', { token: '' });
}

export async function checkConnectivity(): Promise<boolean> {
  try {
    await client.get('/alerts', { timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

export function normalizeSeverity(raw: string): Severity {
  return normalizeAlertSeverity(raw);
}

export function formatConfidence(confidence: number): string {
  if (!confidence || isNaN(confidence)) return '0%';
  const pct = Math.round(Math.min(Math.max(confidence, 0), 1) * 100);
  return `${pct}%`;
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return '—';
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const day = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${time} · ${day}`;
}
