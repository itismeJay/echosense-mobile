import { resolveApiBaseUrl } from './apiConfig.ts';

export const API_BASE_URL = resolveApiBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL
);
export const APP_ENVIRONMENT =
  process.env.EXPO_PUBLIC_APP_ENV?.trim().toLowerCase() ?? 'production';
// The login screen's server option exists only in demo and development builds.
export const SERVER_SWITCHING_ENABLED =
  APP_ENVIRONMENT === 'demo' || APP_ENVIRONMENT === 'development';
export const REFRESH_INTERVAL_MS = 5000;
export const DETECTION_RECENCY_THRESHOLD_MS = 30_000;
export const MAX_ALERTS_IN_MEMORY = 250;

// Colors, type and spacing live in lib/theme.ts.

export const TEAM = [
  'Khirt Abapo',
  'Dharel Khin Melegrito',
  'RB Jay Salamanes',
];

export const SCHOOL = 'Davao del Norte State College';
export const CAPSTONE_YEAR = '2026';
export const APP_VERSION = '1.0.0';
