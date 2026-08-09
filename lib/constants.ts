import { getApiHost, resolveApiBaseUrl } from './apiConfig.ts';

export const API_BASE_URL = resolveApiBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL
);
export const API_HOST = getApiHost(API_BASE_URL);
export const REFRESH_INTERVAL_MS = 5000;
export const DETECTION_RECENCY_THRESHOLD_MS = 30_000;
export const MAX_ALERTS_IN_MEMORY = 250;

export const COLORS = {
  background: '#F6F8FB',
  surface: '#FFFFFF',
  surfaceSecondary: '#EEF2F7',
  card: '#FFFFFF',
  cardBorder: '#D9E0EA',
  border: '#D9E0EA',
  primary: '#2563EB',
  primaryPressed: '#1D4ED8',
  primarySoft: '#93C5FD',
  accent: '#2563EB',
  accentEnd: '#1D4ED8',
  text: '#172033',
  textSecondary: '#5F6B7A',
  textMuted: '#667085',
  textDim: '#667085',
  success: '#15803D',
  successBackground: '#DCFCE7',
  warning: '#92400E',
  warningBackground: '#FEF3C7',
  danger: '#B91C1C',
  dangerBackground: '#FEE2E2',
  dangerBorder: '#FECDD3',
  information: '#0369A1',
  informationBackground: '#DBEAFE',
  offlineBackground: '#FFF1F2',
  high: '#B91C1C',
  medium: '#92400E',
  low: '#0369A1',
  white: '#FFFFFF',
  shadow: '#172033',
} as const;

export const SEVERITY_COLORS: Record<string, string> = {
  high: COLORS.high,
  medium: COLORS.medium,
  low: COLORS.low,
  unknown: COLORS.textSecondary,
};

export const SEVERITY_ICONS: Record<string, string> = {
  high: 'alert-circle',
  medium: 'warning',
  low: 'information-circle',
  unknown: 'help-circle',
};

export const SEVERITY_BACKGROUNDS: Record<string, string> = {
  high: COLORS.dangerBackground,
  medium: COLORS.warningBackground,
  low: COLORS.informationBackground,
  unknown: COLORS.surfaceSecondary,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const RADII = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const TYPOGRAPHY = {
  screenTitle: 26,
  sectionTitle: 19,
  cardTitle: 17,
  body: 16,
  secondary: 14,
  caption: 13,
} as const;

export const TEAM = [
  'Khirt Abapo',
  'Dharel Khin Melegrito',
  'RB Jay Salamanes',
];

export const SCHOOL = 'Davao del Norte State College';
export const CAPSTONE_YEAR = '2026';
export const APP_VERSION = '1.0.0';
