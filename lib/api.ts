import axios from 'axios';
import {
  clearLocalPushRegistration,
  getToken,
  logout,
  notifyPasswordChangeRequired,
} from './auth';
import { SERVER_RULES, checkServerHealth, getServerUrl } from './server';
import { isAllowedServerUrl } from './serverConfig.ts';
import {
  bearerToken,
  classifyAuthFailure,
  handleAuthFailure,
} from './session.ts';
import {
  alertListParams,
  buildReviewRequest,
  type AlertListTab,
  type ReviewStatus,
} from './review.ts';
import type { Alert, AlertSeverity, LogStats } from './types';
import {
  parseAlertListResponse,
  parseAlertResponse,
} from './alertContract';

const client = axios.create({
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use(async (config) => {
  const serverUrl = getServerUrl();
  // Demo builds allow cleartext HTTP at the OS level; only LAN hosts may use it.
  if (!isAllowedServerUrl(serverUrl, SERVER_RULES)) {
    throw new Error('Plain HTTP is only allowed to a local network address');
  }
  config.baseURL = serverUrl;
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const failure = classifyAuthFailure(
      error.response?.status,
      error.response?.data?.detail
    );
    const failedToken = bearerToken(
      error.config?.headers?.Authorization ??
        error.config?.headers?.get?.('Authorization')
    );
    await handleAuthFailure(failure, failedToken, {
      getToken,
      signOut: logout,
      clearLocalPushRegistration,
      onPasswordChangeRequired: notifyPasswordChangeRequired,
    });
    return Promise.reject(error);
  }
);

export async function fetchAlerts(
  tab: AlertListTab = 'all'
): Promise<Alert[]> {
  const { data } = await client.get<unknown>('/alerts/', {
    params: alertListParams(tab),
  });
  return parseAlertListResponse(data, '/alerts/');
}

export async function reviewAlert(
  alertId: number,
  status: ReviewStatus
): Promise<Alert> {
  const { path, body } = buildReviewRequest(alertId, status);
  const { data } = await client.post<unknown>(path, body);
  return parseAlertResponse(data, path);
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<unknown> {
  const { data } = await client.post<unknown>('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return data;
}

export async function fetchMe(): Promise<unknown> {
  const { data } = await client.get<unknown>('/auth/me');
  return data;
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

export function getErrorDetail(caught: unknown): unknown {
  return axios.isAxiosError(caught)
    ? (caught.response?.data as { detail?: unknown } | undefined)?.detail
    : undefined;
}

export async function checkConnectivity(): Promise<boolean> {
  return checkServerHealth(getServerUrl());
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
