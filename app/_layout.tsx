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
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { COLORS } from '../lib/constants';
import {
  restoreSession,
  subscribeToSessionInvalidation,
  wakeup,
  type User,
} from '../lib/auth';
import { canViewReports } from '../lib/presentation';
import {
  getNotifPrefs,
  getNotificationAlertId,
  getPendingAlertId,
  clearPendingAlertId,
  shouldHandleNotificationResponse,
  shouldPresentNotification,
  storePendingAlertId,
  syncPushRegistration,
} from '../lib/notifications';
import LoadingScreen from '../components/LoadingScreen';
import { createNotificationListenerManager } from '../lib/notificationListeners';
import {
  ANDROID_NOTIFICATION_CHANNELS,
} from '../lib/notificationChannels';
import {
  getNotificationSeverity,
  isExpectedNotificationCopy,
} from '../lib/notificationPayload';
import { resolvePendingAlertAction } from '../lib/notificationNavigation';

const isExpoGo = Constants.executionEnvironment === 'storeClient';
const STARTUP_RESTORE_TIMEOUT_MS = 25_000;
const notificationListenerManager =
  createNotificationListenerManager<
    Notifications.Notification,
    Notifications.NotificationResponse
  >();

async function restoreStartupState(): Promise<{
  restoredUser: User | null;
  storedAlertId: string | null;
}> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const fallback = {
    restoredUser: null,
    storedAlertId: null,
  };

  try {
    return await Promise.race([
      Promise.all([restoreSession(), getPendingAlertId()])
        .then(([restoredUser, storedAlertId]) => ({
          restoredUser,
          storedAlertId,
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

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const { data, title, body } = notification.request.content;
    const priority = getNotificationSeverity(data);
    const shouldPresent =
      isExpectedNotificationCopy(title, body, priority) &&
      shouldPresentNotification(data);
    const isHigh = priority === 'high';
    const preferences = await getNotifPrefs();
    const priorityEnabled =
      priority === 'medium'
        ? preferences.medium
        : priority === 'low'
          ? preferences.low
          : true;
    const shouldShow = shouldPresent && priorityEnabled;

    return {
      shouldShowAlert: shouldShow,
      shouldShowBanner: shouldShow,
      shouldShowList: shouldShow,
      shouldPlaySound: shouldShow && isHigh,
      shouldSetBadge: false,
    };
  },
});

export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [pendingAlertId, setPendingAlertId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const navigationState = useRootNavigationState();
  const pathname = usePathname();

  useEffect(() => {
    wakeup();
    let active = true;

    async function queueResponse(
      response: Notifications.NotificationResponse
    ) {
      const data = response.notification.request.content.data;
      if (!shouldHandleNotificationResponse(data)) return;
      const alertId = getNotificationAlertId(data);
      if (!alertId) return;
      await storePendingAlertId(alertId);
      if (active) setPendingAlertId(alertId);
    }

    async function setup() {
      const { restoredUser, storedAlertId } = await startupStatePromise;
      if (!active) return;
      setUser(restoredUser);
      setIsAuthenticated(Boolean(restoredUser));
      setPendingAlertId(storedAlertId);
      setAuthChecked(true);

      if (restoredUser) {
        void syncPushRegistration(restoredUser.id);
      }

      if (!isExpoGo && Platform.OS === 'android') {
        for (const channel of ANDROID_NOTIFICATION_CHANNELS) {
          await Notifications.setNotificationChannelAsync(channel.id, {
            name: channel.name,
            description: channel.description,
            importance:
              channel.importance === 'high'
                ? Notifications.AndroidImportance.HIGH
                : Notifications.AndroidImportance.DEFAULT,
            sound: channel.sound,
            enableVibrate: channel.enableVibrate,
            ...(channel.importance === 'high'
              ? { vibrationPattern: [0, 80] }
              : {}),
          });
        }
      }

      try {
        const lastResponse =
          await Notifications.getLastNotificationResponseAsync();
        if (lastResponse) await queueResponse(lastResponse);
        await Notifications.clearLastNotificationResponseAsync();
      } catch {
        // Notification response APIs can be unavailable on unsupported runtimes.
      }
    }

    setup();

    const stopNotificationListeners = notificationListenerManager.start(
      {
        addReceivedListener: Notifications.addNotificationReceivedListener,
        addResponseListener:
          Notifications.addNotificationResponseReceivedListener,
      },
      () => {
        // Foreground presentation and ID deduplication are handled above.
      },
      (response) => {
        void queueResponse(response);
      }
    );
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
    if (!authChecked || !navigationState?.key) return;

    if (!isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    } else if (isAuthenticated && pathname === '/login') {
      router.replace('/');
    }
  }, [
    authChecked,
    isAuthenticated,
    navigationState?.key,
    pathname,
  ]);

  useEffect(() => {
    const action = resolvePendingAlertAction({
      authChecked,
      navigationReady: Boolean(navigationState?.key),
      isAuthenticated,
      pendingAlertId,
    });
    if (action.type !== 'navigate') return;

    router.push({
      pathname: '/alert/[id]',
      params: { id: action.alertId },
    });
    setPendingAlertId(null);
    void clearPendingAlertId();
  }, [
    authChecked,
    isAuthenticated,
    navigationState?.key,
    pendingAlertId,
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
        setPendingAlertId(null);
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
      </Tabs>
    </AuthContext.Provider>
  );
}
