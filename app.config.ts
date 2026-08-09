const PRODUCTION_API_BASE_URL =
  'https://echosense-backend-75h3.onrender.com';

function resolveConfigApiBaseUrl(configuredValue = PRODUCTION_API_BASE_URL) {
  const trimmedValue = configuredValue.trim().replace(/\/+$/, '');

  if (!trimmedValue) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must not be empty');
  }

  let parsed;
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

module.exports = ({ config }) => {
  const apiBaseUrl = resolveConfigApiBaseUrl(
    process.env.EXPO_PUBLIC_API_BASE_URL
  );
  const appEnvironment =
    process.env.EXPO_PUBLIC_APP_ENV?.trim().toLowerCase() ?? 'production';
  const isDevelopment = appEnvironment === 'development';
  const usesLanHttp = isDevelopment && apiBaseUrl.startsWith('http://');

  if (!isDevelopment && !apiBaseUrl.startsWith('https://')) {
    throw new Error('Preview and production API URLs must use HTTPS');
  }

  return {
    ...config,
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
                'EchoSense development builds connect to the approved local development server.',
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
