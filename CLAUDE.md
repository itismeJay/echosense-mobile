# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server (scan QR code with Expo Go on a physical device)
npm start

# Run on specific platform
npm run android
npm run ios
npm run web
```

No test runner or lint script is configured.

## Architecture

**echosense-mobile** is an Expo SDK ~54 React Native app with TypeScript and the New Architecture enabled. It is a sound/noise monitoring dashboard that polls a REST backend every 5 seconds and fires local push notifications when new alerts arrive.

### Routing

Expo Router (file-based). `app/` maps directly to routes:

- `app/_layout.tsx` — root tab layout; also owns notification permission request and Android channel setup (runs once on mount)
- `app/index.tsx` — dashboard: polls `/alerts` + `/logs/stats` every 5s, tracks seen alert IDs in a ref to fire notifications only for new ones
- `app/logs.tsx` — filterable alert log list
- `app/analytics.tsx` — charts via `react-native-chart-kit`
- `app/settings.tsx` — API connection status, team info

### Data & API Layer

All backend communication is in `lib/api.ts` (axios, 10s timeout, base URL from `lib/constants.ts`):

- `fetchAlerts()` → `GET /alerts`
- `fetchLogs()` → `GET /logs`
- `fetchStats()` → `GET /logs/stats`
- `postAlert(payload)` → `POST /alerts`
- `checkConnectivity()` → `GET /alerts` with 5s timeout, returns bool

Utility formatters also live in `lib/api.ts`: `normalizeSeverity`, `formatConfidence`, `formatTimestamp`.

Shared types (`Alert`, `LogStats`, `Severity`) are in `lib/types.ts`. Constants including `API_BASE_URL`, `COLORS`, `SEVERITY_COLORS`, and `REFRESH_INTERVAL_MS` (5000ms) are in `lib/constants.ts`.

### Notification System

- `_layout.tsx` calls `setNotificationHandler` at module level (foreground sound gating: plays sound only when `data.isHigh === true`)
- On mount, requests permission and registers two Android channels: `high-alerts` (sound + vibration) and `other-alerts` (silent)
- `app/index.tsx` holds `seenAlertIds` (a `useRef<Set<number>>`) and `isFirstLoad` ref — on first poll, existing alerts are silently registered; subsequent polls fire `scheduleNotificationAsync` for any unseen alert IDs
- High severity → sound on both platforms; medium/low → silent

### Styling

The codebase uses `StyleSheet.create` for most component styles. NativeWind v4 is installed but sparingly used — don't mix both on the same component.

### Backend

Hosted on Render.com free tier at `https://echosense-backend-75h3.onrender.com`. Free tier spins down after 15 min of inactivity; cold starts take 30–60s, which exceeds the 5s connectivity check timeout and triggers the offline indicator.
