import axios from 'axios';
import { API_BASE_URL } from './constants';
import { getToken, logout } from './auth';
import type { Alert, AlertSeverity, LogStats } from './types';
import {
  parseAlertListResponse,
  parseAlertResponse,
} from './alertContract';

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
      const authorization =
        error.config?.headers?.Authorization ??
        error.config?.headers?.get?.('Authorization');
      const failedToken =
        typeof authorization === 'string' &&
        authorization.startsWith('Bearer ')
          ? authorization.slice('Bearer '.length)
          : null;
      const currentToken = await getToken();

      // Ignore a delayed 401 from a request that used an older token. It must
      // not invalidate a session created while that request was in flight.
      if (failedToken && currentToken === failedToken) {
        await logout();
      }
    }
    return Promise.reject(error);
  }
);

export async function fetchAlerts(): Promise<Alert[]> {
  const { data } = await client.get<unknown>('/alerts/');
  return parseAlertListResponse(data, '/alerts/');
}

export async function fetchLogs(): Promise<Alert[]> {
  const { data } = await client.get<unknown>('/logs/');
  return parseAlertListResponse(data, '/logs/');
}

export async function fetchStats(): Promise<LogStats> {
  const { data } = await client.get<LogStats>('/logs/stats');
  return data;
}

export async function fetchAvailableAlert(id: number): Promise<Alert | null> {
  try {
    const { data } = await client.get<unknown>(`/alerts/${id}`);
    return parseAlertResponse(data, `/alerts/${id}`);
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
  const { data } = await client.post<Alert>('/alerts/', payload);
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
    await client.get('/alerts/', { timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

export function normalizeSeverity(raw: string): AlertSeverity {
  const severity = raw.trim().toLowerCase();
  return severity === 'high' ||
    severity === 'medium' ||
    severity === 'low'
    ? severity
    : 'unknown';
}

export function getHttpStatus(caught: unknown): number | null {
  return axios.isAxiosError(caught) &&
    typeof caught.response?.status === 'number'
    ? caught.response.status
    : null;
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
