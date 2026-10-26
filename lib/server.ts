import axios from 'axios';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {
  API_BASE_URL,
  APP_ENVIRONMENT,
  SERVER_SWITCHING_ENABLED,
} from './constants';
import {
  HEALTH_CHECK_TIMEOUT_MS,
  isAllowedServerUrl,
  isHealthyResponse,
  parseServerAddress,
  type ServerRules,
} from './serverConfig.ts';

/** localhost is the Mac only on the iOS Simulator, and only in development. */
export const SERVER_RULES: ServerRules = {
  allowLoopback:
    APP_ENVIRONMENT === 'development' &&
    Platform.OS === 'ios' &&
    !Device.isDevice,
};

const SERVER_URL_KEY = 'echosense_server_url_v1';
const listeners = new Set<(url: string) => void>();
let currentServerUrl = API_BASE_URL;

/** The server every API call and push registration uses right now. */
export function getServerUrl(): string {
  return currentServerUrl;
}

export function subscribeToServerChanges(
  listener: (url: string) => void
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Load the saved server before the session is restored. */
export async function loadSavedServer(): Promise<string> {
  if (!SERVER_SWITCHING_ENABLED) return currentServerUrl;
  try {
    const saved = await SecureStore.getItemAsync(SERVER_URL_KEY);
    const parsed = saved ? parseServerAddress(saved, SERVER_RULES) : null;
    if (parsed?.ok && isAllowedServerUrl(parsed.url, SERVER_RULES)) {
      currentServerUrl = parsed.url;
    }
  } catch {
    // Keep the build's default server when storage is unavailable.
  }
  return currentServerUrl;
}

export async function saveServer(url: string): Promise<void> {
  await SecureStore.setItemAsync(SERVER_URL_KEY, url);
  currentServerUrl = url;
  for (const listener of listeners) listener(url);
}

export async function checkServerHealth(url: string): Promise<boolean> {
  try {
    const response = await axios.get<unknown>(`${url}/health`, {
      timeout: HEALTH_CHECK_TIMEOUT_MS,
      validateStatus: () => true,
    });
    return isHealthyResponse(response.status, response.data);
  } catch {
    return false;
  }
}
