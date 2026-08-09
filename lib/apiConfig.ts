export const PRODUCTION_API_BASE_URL =
  'https://echosense-backend-75h3.onrender.com';

export function resolveApiBaseUrl(
  configuredValue: string | undefined,
  fallbackValue = PRODUCTION_API_BASE_URL
): string {
  const rawValue = configuredValue === undefined
    ? fallbackValue
    : configuredValue;
  const trimmedValue = rawValue.trim().replace(/\/+$/, '');

  if (!trimmedValue) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must not be empty');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmedValue);
  } catch {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must be a valid URL');
  }

  if (
    (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== '/'
  ) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL must be an HTTP(S) origin without credentials, a path, query, or fragment'
    );
  }

  return parsed.origin;
}

export function getApiHost(apiBaseUrl: string): string {
  try {
    return new URL(apiBaseUrl).host;
  } catch {
    return 'Unavailable';
  }
}
