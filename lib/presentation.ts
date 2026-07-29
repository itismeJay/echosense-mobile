import type { Alert, AlertSeverity } from './types';

export type AppRole = 'admin' | 'staff' | 'counselor' | string;

export function normalizeSeverity(
  raw: string | null | undefined
): AlertSeverity {
  const severity = (raw ?? '').toLowerCase();
  if (severity === 'high' || severity === 'medium' || severity === 'low') {
    return severity;
  }
  return 'unknown';
}

export function getPriorityLabel(raw: string | null | undefined): string {
  const severity = normalizeSeverity(raw);
  return severity === 'unknown'
    ? 'PRIORITY UNAVAILABLE'
    : `${severity.toUpperCase()} PRIORITY`;
}

export function getAlertTitle(raw: string | null | undefined): string {
  switch (normalizeSeverity(raw)) {
    case 'high':
      return 'High-priority classroom alert';
    case 'medium':
      return 'Possible verbal-aggression indicators';
    case 'low':
      return 'Possible classroom concern';
    default:
      return 'Alert severity unavailable';
  }
}

export function getAlertExplanation(raw: string | null | undefined): string {
  switch (normalizeSeverity(raw)) {
    case 'high':
      return 'EchoSense noticed sounds or speech that may need prompt attention.';
    case 'medium':
      return 'EchoSense noticed sounds or speech that may need attention.';
    case 'low':
      return 'EchoSense recorded a possible classroom alert for your awareness.';
    default:
      return 'This alert still requires human review, but its stored severity value is unavailable.';
  }
}

export function getRoleLabel(role: AppRole | null | undefined): string {
  switch ((role ?? '').toLowerCase()) {
    case 'admin':
      return 'Administrator';
    case 'counselor':
      return 'Guidance counselor';
    case 'staff':
      return 'Teacher';
    default:
      return 'Staff';
  }
}

export function canViewReports(role: AppRole | null | undefined): boolean {
  return role === 'admin' || role === 'counselor';
}

export function canViewTechnicalDetails(
  role: AppRole | null | undefined
): boolean {
  return role === 'admin';
}

export function humanizeStatus(status: string | null | undefined): string {
  if (!status?.trim()) return 'Available';
  return status
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function isToday(iso: string, now = new Date()): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function isWithinDays(iso: string, days: number, now = new Date()): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const difference = now.getTime() - date.getTime();
  return difference >= 0 && difference <= days * 24 * 60 * 60 * 1000;
}

export function sortAlertsNewestFirst(alerts: Alert[]): Alert[] {
  return [...alerts].sort((left, right) => {
    const rightTime = new Date(right.created_at).getTime();
    const leftTime = new Date(left.created_at).getTime();
    return (Number.isNaN(rightTime) ? 0 : rightTime) -
      (Number.isNaN(leftTime) ? 0 : leftTime);
  });
}

export function buildAlertNotificationCopy(alert: Alert): {
  title: string;
  body: string;
} {
  switch (normalizeSeverity(alert.severity)) {
    case 'high':
      return {
        title: 'High-priority classroom alert',
        body: 'Strong possible-aggression indicators were detected. Prompt human review is recommended.',
      };
    case 'medium':
      return {
        title: 'Possible verbal-aggression indicators',
        body: 'A medium-severity unverified alert requires staff review.',
      };
    case 'low':
      return {
        title: 'Possible classroom concern',
        body: 'A low-severity unverified alert requires staff review.',
      };
    default:
      return {
        title: 'Classroom alert',
        body: 'Unverified possible-aggression alert. Human review required.',
      };
  }
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return 'Time unavailable';
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  if (!iso || Number.isNaN(new Date(iso).getTime())) {
    return 'Date and time unavailable';
  }
  return `${formatTime(iso)} · ${formatDate(iso)}`;
}

export function formatLastUpdated(date: Date | null): string {
  if (!date) return 'Not updated yet';
  return `Last updated ${date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })}`;
}
