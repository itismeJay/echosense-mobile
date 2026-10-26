import type { ConfigContext, ExpoConfig } from 'expo/config';

const PRODUCTION_API_BASE_URL =
  'https://echosense-backend-75h3.onrender.com';

function resolveConfigApiBaseUrl(
  configuredValue: string = PRODUCTION_API_BASE_URL
): string {
  const trimmedValue = configuredValue.trim().replace(/\/+$/, '');

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

export default ({ config }: ConfigContext): ExpoConfig => {
  const apiBaseUrl = resolveConfigApiBaseUrl(
    process.env.EXPO_PUBLIC_API_BASE_URL
  );
  const appEnvironment =
    process.env.EXPO_PUBLIC_APP_ENV?.trim().toLowerCase() ?? 'production';
  const isDevelopment = appEnvironment === 'development';
  // The demo build starts on the live HTTPS server and can be switched to a
  // local server on the login screen.
  const isDemo = appEnvironment === 'demo';
  // Both builds offer the login screen's server option, so a local HTTP
  // server must be reachable even when the build starts on HTTPS.
  const usesLanHttp = isDevelopment || isDemo;

  if (!isDevelopment && !apiBaseUrl.startsWith('https://')) {
    throw new Error('Preview and production API URLs must use HTTPS');
  }

  return {
    ...config,
    // ConfigContext types app.json values as optional; these mirror app.json.
    name: config.name ?? 'EchoSense',
    slug: config.slug ?? 'echosense-mobile',
    android: {
      ...config.android,
      googleServicesFile: './google-services.json',
    },
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        ...(usesLanHttp
          ? {
              NSAppTransportSecurity: {
                NSAllowsLocalNetworking: true,
              },
              NSLocalNetworkUsageDescription:
                'EchoSense connects to an EchoSense server on your local network.',
            }
          : {}),
      },
    },
    plugins: [
      ...(config.plugins ?? []),
      [
        'expo-build-properties',
        {
          android: {
            // Android cannot scope cleartext to IP ranges. The app itself only
            // sends plain HTTP to 10.x, 172.16–31.x and 192.168.x addresses
            // (lib/serverConfig.ts, enforced in the lib/api.ts interceptor).
            usesCleartextTraffic: usesLanHttp,
          },
        },
      ],
    ],
    extra: {
      ...config.extra,
      apiBaseUrl,
      appEnvironment,
    },
  };
};
