# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server (opens QR code for Expo Go)
npm start

# Run on specific platform
npm run android
npm run ios
npm run web
```

There is no test runner or lint script configured yet.

## Architecture

**echosense-mobile** is an Expo (SDK ~54) React Native app with TypeScript and the New Architecture enabled. It appears to be a sound/noise monitoring and alerting application.

### Routing

The app uses **Expo Router** (file-based routing) — `app/` maps directly to routes:
- `app/_layout.tsx` — root layout (configure tab navigator here)
- `app/index.tsx` — dashboard/home tab
- `app/logs.tsx` — logs tab
- `app/analytics.tsx` — analytics tab

Navigation is driven by `@react-navigation/bottom-tabs` via Expo Router's tab layout.

### Styling

**NativeWind v4** is the styling solution — use Tailwind class names via `className` prop. Do not mix StyleSheet and NativeWind on the same component unnecessarily.

### Data Layer

- `lib/api.ts` — axios-based API client
- `lib/types.ts` — shared TypeScript types (AlertCard, SeverityBadge, StatCard suggest alert/severity/metric domain types)
- `lib/constants.ts` — shared constants (API base URL, etc.)

### Key Dependencies

| Package | Purpose |
|---|---|
| `expo-router` | File-based routing |
| `nativewind` | Tailwind CSS for React Native |
| `axios` | HTTP client for backend API |
| `react-native-chart-kit` + `react-native-svg` | Charts on the analytics screen |
| `expo-notifications` | Push notification support |
| `expo-constants` | Access to app config/env at runtime |

### Entry Point

`index.ts` → `App.tsx` via `registerRootComponent`. Once Expo Router's `_layout.tsx` is configured, `App.tsx` will likely be replaced by the router's root.
