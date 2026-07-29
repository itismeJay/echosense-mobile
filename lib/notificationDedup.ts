const DEFAULT_WINDOW_MS = 10 * 60 * 1000;

export function extractAlertId(
  data: Record<string, unknown> | null | undefined
): string | null {
  const value = data?.alertId ?? data?.alert_id;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value.trim())) {
    return String(Number(value.trim()));
  }
  return null;
}

export class NotificationDeduper {
  private readonly seen = new Map<string, number>();
  private readonly windowMs: number;

  constructor(windowMs = DEFAULT_WINDOW_MS) {
    this.windowMs = windowMs;
  }

  shouldHandle(alertId: string | null, now = Date.now()): boolean {
    if (!alertId) return true;

    for (const [id, timestamp] of this.seen) {
      if (now - timestamp > this.windowMs) this.seen.delete(id);
    }

    const previous = this.seen.get(alertId);
    if (previous !== undefined && now - previous <= this.windowMs) {
      return false;
    }

    this.seen.set(alertId, now);
    return true;
  }

  clear(): void {
    this.seen.clear();
  }
}
