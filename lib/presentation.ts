import type { Alert, Severity } from './types';

export type AppRole = 'admin' | 'staff' | 'counselor' | string;

export function normalizeSeverity(raw: string | null | undefined): Severity {
  const severity = (raw ?? '').toLowerCase();
  if (severity === 'high' || severity === 'medium' || severity === 'low') {
    return severity;
  }
  return 'low';
}

export function getPriorityLabel(raw: string | null | undefined): string {
  return `${normalizeSeverity(raw).toUpperCase()} PRIORITY`;
}

export function getAlertExplanation(raw: string | null | undefined): string {
  switch (normalizeSeverity(raw)) {
    case 'high':
      return 'EchoSense noticed sounds or speech that may need prompt attention.';
    case 'medium':
      return 'EchoSense noticed sounds or speech that may need attention.';
    default:
      return 'EchoSense recorded a possible classroom alert for your awareness.';
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
  const priority = normalizeSeverity(alert.severity);
  const priorityLabel =
    priority === 'high'
      ? 'High-priority'
      : priority === 'medium'
        ? 'Medium-priority'
        : 'Low-priority';
  const location = alert.location?.trim() || 'the classroom';

  return {
    title: 'EchoSense Classroom Alert',
    body: `${priorityLabel} alert in ${location}. Open EchoSense to view the available information.`,
  };
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
