import { PRODUCTION_API_BASE_URL } from './apiConfig.ts';

export const LIVE_SERVER_URL = PRODUCTION_API_BASE_URL;
export const HEALTH_CHECK_TIMEOUT_MS = 8_000;

export type ServerAddressResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** True only for 10.x.x.x, 172.16–31.x.x and 192.168.x.x. */
export function isPrivateLanHost(host: string): boolean {
  const match = IPV4_PATTERN.exec(host);
  if (!match) return false;
  const octets = match.slice(1).map(Number);
  if (octets.some((octet) => octet > 255)) return false;
  const [first, second] = octets;
  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

/**
 * Validate a server address typed on the login screen. The live server is
 * always allowed; anything else must be a private LAN IPv4 address, so plain
 * HTTP never leaves the local network.
 */
export function parseServerAddress(input: string): ServerAddressResult {
  let value = input.trim().replace(/\/+$/, '');
  if (!value) {
    return { ok: false, error: 'Enter a server address.' };
  }
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    value = `http://${value}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: 'That doesn’t look like a server address.' };
  }

  if (parsed.origin === LIVE_SERVER_URL) {
    return { ok: true, url: LIVE_SERVER_URL };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Use an address that starts with http://.' };
  }
  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== '/'
  ) {
    return {
      ok: false,
      error: 'Enter only the address and port, like http://192.168.1.20:8000.',
    };
  }
  if (!isPrivateLanHost(parsed.hostname)) {
    return {
      ok: false,
      error:
        'Use a local network address (192.168.x.x, 10.x.x.x or 172.16–31.x.x).',
    };
  }
  return { ok: true, url: parsed.origin };
}

/**
 * Plain HTTP is allowed only to a private LAN address. Android cannot limit
 * cleartext traffic to IP ranges, so the app enforces it on every request.
 */
export function isAllowedServerUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return true;
    return parsed.protocol === 'http:' && isPrivateLanHost(parsed.hostname);
  } catch {
    return false;
  }
}

export function isLiveServer(url: string): boolean {
  return url === LIVE_SERVER_URL;
}

export function describeServer(url: string): string {
  if (isLiveServer(url)) return 'Live (Render)';
  try {
    return `Local (${new URL(url).host})`;
  } catch {
    return 'Unavailable';
  }
}

export function isHealthyResponse(status: number, body: unknown): boolean {
  return (
    status === 200 &&
    typeof body === 'object' &&
    body !== null &&
    (body as { status?: unknown }).status === 'ok'
  );
}

export type ServerSwitchResult =
  | { status: 'unchanged' }
  | { status: 'switched'; url: string; signedOut: boolean }
  | { status: 'invalid'; error: string }
  | { status: 'unreachable' };

export interface ServerSwitchDependencies {
  currentUrl: string;
  checkHealth: (url: string) => Promise<boolean>;
  hasSession: () => Promise<boolean>;
  /** Detach this device's push token from the old server, best effort. */
  detachPushToken: () => Promise<void>;
  /** Forget the stored push registration so it registers again. */
  clearLocalPushRegistration: () => Promise<void>;
  signOut: () => Promise<void>;
  saveServer: (url: string) => Promise<void>;
}

/**
 * Switch servers only after /health answers. Any session and push
 * registration belong to the old server, so both are cleared first.
 */
export async function switchServer(
  input: string,
  dependencies: ServerSwitchDependencies
): Promise<ServerSwitchResult> {
  const parsed = parseServerAddress(input);
  if (!parsed.ok) return { status: 'invalid', error: parsed.error };
  if (parsed.url === dependencies.currentUrl) return { status: 'unchanged' };

  let healthy = false;
  try {
    healthy = await dependencies.checkHealth(parsed.url);
  } catch {
    healthy = false;
  }
  if (!healthy) return { status: 'unreachable' };

  const signedIn = await dependencies.hasSession();
  if (signedIn) {
    try {
      await dependencies.detachPushToken();
    } catch {
      // The old server may be offline. The local registration is still
      // cleared below so the new server always gets a fresh registration.
    }
  }
  await dependencies.clearLocalPushRegistration();
  if (signedIn) await dependencies.signOut();
  await dependencies.saveServer(parsed.url);
  return { status: 'switched', url: parsed.url, signedOut: signedIn };
}
