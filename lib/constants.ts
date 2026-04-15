export const API_BASE_URL = 'https://echosense-backend-75h3.onrender.com';
export const REFRESH_INTERVAL_MS = 5000;
export const DETECTION_RECENCY_THRESHOLD_MS = 30_000;

export const COLORS = {
  background: '#0a0a0f',
  card: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.1)',
  accent: '#6366f1',
  accentEnd: '#8b5cf6',
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.6)',
  textDim: 'rgba(255,255,255,0.35)',
} as const;

export const SEVERITY_COLORS: Record<string, string> = {
  high: COLORS.high,
  medium: COLORS.medium,
  low: COLORS.low,
};

export const SEVERITY_ICONS: Record<string, string> = {
  high: 'alert-circle',
  medium: 'warning',
  low: 'information-circle',
};

export const TEAM = [
  'Khirt Abapo',
  'Dharel Khin Melegrito',
  'RB Jay Salamanes',
];

export const SCHOOL = 'Davao del Norte State College';
export const CAPSTONE_YEAR = '2026';
export const APP_VERSION = '1.0.0';
