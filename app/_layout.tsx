import '../global.css';
import {
  Tabs,
  router,
  usePathname,
  useRootNavigationState,
} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, {
  createContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type {
  Notification,
  NotificationResponse,
} from 'expo-notifications';
import { COLORS } from '../lib/constants';
import {
  restoreSession,
  subscribeToSessionInvalidation,
  wakeup,
  type User,
} from '../lib/auth';
import { canViewReports } from '../lib/presentation';
import {
  getPendingNotificationIntent,
  clearPendingNotificationIntent,
  shouldHandleNotificationResponse,
  shouldPresentNotification,
  storePendingNotificationIntent,
  syncPushRegistration,
} from '../lib/notifications';
import LoadingScreen from '../components/LoadingScreen';
import { createNotificationListenerManager } from '../lib/notificationListeners';
import { parseNotificationEnvelope } from '../lib/notificationPayload';
import {
  createPendingNotificationIntent,
  resolvePendingNotificationAction,
  type PendingNotificationIntent,
} from '../lib/notificationNavigation';
import {
  ensureAndroidNotificationChannels,
  getExpoNotifications,
} from '../lib/notificationRuntime';
import { createPushRegistrationLifecycle } from '../lib/pushRegistration';
import { getForegroundNotificationBehavior } from '../lib/notificationPresentation';

const STARTUP_RESTORE_TIMEOUT_MS = 25_000;
const notificationListenerManager =
  createNotificationListenerManager<Notification, NotificationResponse>();

async function restoreStartupState(): Promise<{
  restoredUser: User | null;
  pendingIntent: PendingNotificationIntent | null;
}> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const fallback = {
    restoredUser: null,
    pendingIntent: null,
  };

  try {
    return await Promise.race([
      Promise.all([restoreSession(), getPendingNotificationIntent()])
        .then(([restoredUser, pendingIntent]) => ({
          restoredUser,
          pendingIntent,
        }))
        .catch(() => fallback),
      new Promise<typeof fallback>((resolve) => {
        timeoutId = setTimeout(
          () => resolve(fallback),
          STARTUP_RESTORE_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

const startupStatePromise = restoreStartupState();

interface AuthContextValue {
  isAuthenticated: boolean;
  user: User | null;
  onSignIn: (user: User) => void;
  onSignOut: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  user: null,
  onSignIn: () => {},
  onSignOut: () => {},
});

async function configureNotificationHandler() {
  const notifications = await getExpoNotifications();
  if (!notifications) return;

  try {
    notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const { data, title, body } = notification.request.content;
        const parsed = parseNotificationEnvelope(data, title, body);
        const shouldPresent = shouldPresentNotification(
          data,
          title,
          body
        );
        return getForegroundNotificationBehavior(parsed, shouldPresent);
      },
    });
  } catch {
    // Unsupported notification runtimes fail closed without blocking startup.
  }
}

const notificationRuntimeReady = Promise.all([
  configureNotificationHandler(),
  ensureAndroidNotificationChannels(),
]);

export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [pendingIntent, setPendingIntent] =
    useState<PendingNotificationIntent | null>(null);
  const insets = useSafeAreaInsets();
  const navigationState = useRootNavigationState();
  const pathname = usePathname();

  useEffect(() => {
    wakeup();
    let active = true;
    let stopNotificationListeners = () => {};

    async function queueResponse(
      response: NotificationResponse
    ) {
      const { data, title, body } =
        response.notification.request.content;
      if (!shouldHandleNotificationResponse(data, title, body)) return;
      const parsed = parseNotificationEnvelope(data, title, body);
      if (!parsed) return;
      const intent = createPendingNotificationIntent(
        parsed,
        new Date().toISOString()
      );
      if (!intent) return;
      try {
        await storePendingNotificationIntent(intent);
      } catch {
        // Continue with the in-memory trusted intent when storage is unavailable.
      }
      if (active) setPendingIntent(intent);
    }

    async function setup() {
      await notificationRuntimeReady;
      const notifications = await getExpoNotifications();
      const { restoredUser, pendingIntent: storedIntent } =
        await startupStatePromise;
      if (!active) return;
      setUser(restoredUser);
      setIsAuthenticated(Boolean(restoredUser));
      setPendingIntent(storedIntent);
      setAuthChecked(true);

      if (notifications) {
        try {
          const lastResponse =
            await notifications.getLastNotificationResponseAsync();
          if (lastResponse) await queueResponse(lastResponse);
          await notifications.clearLastNotificationResponseAsync();
        } catch {
          // Notification response APIs can be unavailable on unsupported runtimes.
        }
      }

      if (!active || !notifications) return;
      stopNotificationListeners = notificationListenerManager.start(
        {
          addReceivedListener:
            notifications.addNotificationReceivedListener,
          addResponseListener:
            notifications.addNotificationResponseReceivedListener,
        },
        () => {
          // Foreground presentation and ID deduplication are handled above.
        },
        (response) => {
          void queueResponse(response);
        }
      );
    }

    void setup();
    const unsubscribeSession = subscribeToSessionInvalidation(() => {
      if (!active) return;
      setUser(null);
      setIsAuthenticated(false);
    });

    return () => {
      active = false;
      stopNotificationListeners();
      unsubscribeSession();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    let active = true;
    let stopPushLifecycle = () => {};

    async function setupPushLifecycle() {
      await notificationRuntimeReady;
      const notifications = await getExpoNotifications();
      if (!active) return;
      if (!notifications) {
        void syncPushRegistration(userId);
        return;
      }
      const lifecycle = createPushRegistrationLifecycle({
        syncRegistration: () => syncPushRegistration(userId),
        addPushTokenChangeListener: (listener) =>
          typeof notifications.addPushTokenListener === 'function'
            ? notifications.addPushTokenListener(() => listener())
            : { remove: () => {} },
        addAppStateChangeListener: (listener) =>
          AppState.addEventListener('change', listener),
      });
      stopPushLifecycle = lifecycle.start();
      void syncPushRegistration(userId);
    }

    void setupPushLifecycle();
    return () => {
      active = false;
      stopPushLifecycle();
    };
  }, [user?.id]);

  useEffect(() => {
    if (!authChecked || !navigationState?.key) return;

    if (!isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    } else if (
      isAuthenticated &&
      pathname === '/login' &&
      !pendingIntent
    ) {
      router.replace('/');
    }
  }, [
    authChecked,
    isAuthenticated,
    navigationState?.key,
    pendingIntent,
    pathname,
  ]);

  useEffect(() => {
    const action = resolvePendingNotificationAction({
      authChecked,
      navigationReady: Boolean(navigationState?.key),
      isAuthenticated,
      pendingIntent,
    });
    if (action.type === 'navigate-alert') {
      router.push({
        pathname: '/alert/[id]',
        params: {
          id: String(action.alertId),
          notificationEventId: action.eventId ?? undefined,
          notificationTest: action.isTest ? 'true' : undefined,
        },
      });
    } else if (action.type === 'navigate-provider-test') {
      router.push({
        pathname: '/notifications/test',
        params: {
          testId: action.testId,
          receivedAt: action.receivedAt,
        },
      });
    } else {
      if (action.type === 'none' && pendingIntent) {
        setPendingIntent(null);
        void clearPendingNotificationIntent();
      }
      return;
    }
    setPendingIntent(null);
    void clearPendingNotificationIntent();
  }, [
    authChecked,
    isAuthenticated,
    navigationState?.key,
    pendingIntent,
  ]);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      user,
      onSignIn: (signedInUser) => {
        setUser(signedInUser);
        setIsAuthenticated(true);
      },
      onSignOut: () => {
        setUser(null);
        setIsAuthenticated(false);
        setPendingIntent(null);
      },
    }),
    [isAuthenticated, user]
  );

  if (!authChecked) {
    return <LoadingScreen message="Opening EchoSense…" />;
  }

  const showReports = canViewReports(user?.role);
  const tabBarStyle = {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    minHeight: 60 + insets.bottom,
    paddingTop: 6,
    paddingBottom: Math.max(insets.bottom, 8),
  } as const;

  return (
    <AuthContext.Provider value={contextValue}>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      <Tabs
        initialRouteName={isAuthenticated ? 'index' : 'login'}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarStyle:
            route.name === 'login' || !isAuthenticated
              ? { display: 'none' }
              : tabBarStyle,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          tabBarItemStyle: {
            minHeight: 52,
          },
        })}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarAccessibilityLabel: 'Home tab',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="alerts"
          options={{
            title: 'Alerts',
            tabBarAccessibilityLabel: 'Alerts tab',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'notifications' : 'notifications-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarAccessibilityLabel: 'Alert history tab',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'time' : 'time-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            href: showReports ? '/analytics' : null,
            title: 'Reports',
            tabBarAccessibilityLabel: 'Reports tab',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'bar-chart' : 'bar-chart-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarAccessibilityLabel: 'Profile tab',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'person-circle' : 'person-circle-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen name="logs" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="login" options={{ href: null }} />
        <Tabs.Screen name="alert/[id]" options={{ href: null }} />
        <Tabs.Screen name="notifications/test" options={{ href: null }} />
      </Tabs>
    </AuthContext.Provider>
  );
}
