import axios from 'axios';
import { router } from 'expo-router';
import { API_BASE_URL } from './constants';
import { getToken, logout } from './auth';
import type { Alert, LogStats, Severity } from './types';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
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

export async function postAlert(
  payload: Omit<Alert, 'id' | 'created_at'>
): Promise<Alert> {
  const { data } = await client.post<Alert>('/alerts', payload);
  return data;
}

export async function checkConnectivity(): Promise<boolean> {
  try {
    await client.get('/alerts', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export function normalizeSeverity(raw: string): Severity {
  const s = (raw ?? '').toLowerCase();
  if (s === 'high' || s === 'medium' || s === 'low') return s;
  return 'low';
}

export function formatConfidence(confidence: number): string {
  if (!confidence || isNaN(confidence)) return '0%';
  const pct = Math.round(Math.min(Math.max(confidence, 0), 1) * 100);
  return `${pct}%`;
}

export function formatTimestamp(iso: string): string {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    const time = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const day = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${time} — ${day}`;
  } catch {
    return iso;
  }
}
