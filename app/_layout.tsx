import '../global.css';
import {
  Tabs,
  router,
  usePathname,
  useRootNavigationState,
} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
  useFonts,
} from '@expo-google-fonts/ibm-plex-sans';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, {
  createContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ActivityIndicator, AppState, StyleSheet, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type {
  Notification,
  NotificationResponse,
} from 'expo-notifications';
import {
  restoreSession,
  subscribeToSessionEvents,
  wakeup,
  type SignOutReason,
  type User,
} from '../lib/auth';
import { visibleTabs, type AppTab } from '../lib/access';
import { loadSavedServer } from '../lib/server';
import { FONTS, RADIUS, paletteFor } from '../lib/theme';
import {
  getPendingNotificationIntent,
  clearPendingNotificationIntent,
  shouldHandleNotificationResponse,
  shouldPresentNotification,
  storePendingNotificationIntent,
  syncPushRegistration,
} from '../lib/notifications';
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
  signOutReason?: SignOutReason;
  pendingIntent: PendingNotificationIntent | null;
}> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const fallback = {
    restoredUser: null,
    pendingIntent: null,
  };

  try {
    return await Promise.race([
      // The saved server must load first: the session belongs to it.
      loadSavedServer()
        .then(() =>
          Promise.all([restoreSession(), getPendingNotificationIntent()])
        )
        .then(([restored, pendingIntent]) => ({
          restoredUser: restored.user,
          signOutReason: restored.reason,
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
  /** Why the last session ended, shown once on the login screen. */
  signOutReason: SignOutReason | null;
  onSignIn: (user: User) => void;
  onSignOut: () => void;
  onUserUpdated: (user: User) => void;
}

export const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  user: null,
  signOutReason: null,
  onSignIn: () => {},
  onSignOut: () => {},
  onUserUpdated: () => {},
});

const TAB_ICONS: Record<AppTab, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  alerts: ['notifications', 'notifications-outline'],
  analytics: ['bar-chart', 'bar-chart-outline'],
  settings: ['server', 'server-outline'],
  profile: ['person-circle', 'person-circle-outline'],
};

const TAB_TITLES: Record<AppTab, string> = {
  alerts: 'Alerts',
  analytics: 'Reports',
  settings: 'System info',
  profile: 'Profile',
};

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
  const [signOutReason, setSignOutReason] = useState<SignOutReason | null>(
    null
  );
  const [pendingIntent, setPendingIntent] =
    useState<PendingNotificationIntent | null>(null);
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
  });
  const colorScheme = useColorScheme();
  const palette = paletteFor(colorScheme);
  const insets = useSafeAreaInsets();
  const mustChangePassword = user?.must_change_password === true;
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
      const {
        restoredUser,
        signOutReason: startupReason,
        pendingIntent: storedIntent,
      } = await startupStatePromise;
      if (!active) return;
      setUser(restoredUser);
      setIsAuthenticated(Boolean(restoredUser));
      if (startupReason === 'school_inactive') {
        setSignOutReason(startupReason);
      }
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
    const unsubscribeSession = subscribeToSessionEvents((event) => {
      if (!active) return;
      if (event.type === 'password-change-required') {
        setUser((current) =>
          current ? { ...current, must_change_password: true } : current
        );
        return;
      }
      setUser(null);
      setIsAuthenticated(false);
      setSignOutReason(
        event.reason === 'school_inactive' ? event.reason : null
      );
    });

    return () => {
      active = false;
      stopNotificationListeners();
      unsubscribeSession();
    };
  }, []);

  useEffect(() => {
    // The backend refuses /users/push-token until the forced password change
    // is done. Registration starts as soon as the flag clears.
    if (!user?.id || mustChangePassword) return;
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
  }, [user?.id, mustChangePassword]);

  useEffect(() => {
    if (!authChecked || !navigationState?.key) return;

    if (!isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    } else if (
      isAuthenticated &&
      mustChangePassword &&
      pathname !== '/change-password'
    ) {
      // Every other screen stays blocked until the password is changed.
      router.replace('/change-password');
    } else if (
      isAuthenticated &&
      !mustChangePassword &&
      pathname === '/login' &&
      !pendingIntent
    ) {
      router.replace('/alerts');
    }
  }, [
    authChecked,
    isAuthenticated,
    mustChangePassword,
    navigationState?.key,
    pendingIntent,
    pathname,
  ]);

  useEffect(() => {
    const action = resolvePendingNotificationAction({
      authChecked,
      navigationReady: Boolean(navigationState?.key),
      // A notification opened during a forced password change waits for it.
      isAuthenticated: isAuthenticated && !mustChangePassword,
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
    mustChangePassword,
    navigationState?.key,
    pendingIntent,
  ]);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      user,
      signOutReason,
      onSignIn: (signedInUser) => {
        setUser(signedInUser);
        setIsAuthenticated(true);
        setSignOutReason(null);
      },
      onSignOut: () => {
        setUser(null);
        setIsAuthenticated(false);
        setPendingIntent(null);
      },
      onUserUpdated: (updatedUser) => setUser(updatedUser),
    }),
    [isAuthenticated, signOutReason, user]
  );

  const navigationTheme = useMemo(() => {
    const base = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: palette.link,
        background: palette.background,
        card: palette.surface,
        text: palette.text,
        border: palette.line,
      },
    };
  }, [colorScheme, palette]);

  if (!authChecked || (!fontsLoaded && !fontError)) {
    // Fonts may still be loading, so this avoids text in a fallback face.
    return (
      <View style={[styles.boot, { backgroundColor: palette.background }]}>
        <ActivityIndicator size="large" color={palette.textMuted} />
      </View>
    );
  }

  const tabs = visibleTabs(user);
  const hideTabBar = !isAuthenticated || mustChangePassword;
  const tabBarStyle = {
    backgroundColor: palette.surface,
    borderTopColor: palette.line,
    borderTopWidth: 1,
    minHeight: 64 + insets.bottom,
    paddingTop: 8,
    paddingBottom: Math.max(insets.bottom, 8),
  } as const;

  function tabOptions(tab: AppTab) {
    const [activeIcon, inactiveIcon] = TAB_ICONS[tab];
    return {
      href: tabs.includes(tab) && !hideTabBar ? undefined : null,
      title: TAB_TITLES[tab],
      tabBarAccessibilityLabel: `${TAB_TITLES[tab]} tab`,
      tabBarIcon: ({ focused }: { focused: boolean }) => (
        <View
          style={[
            styles.tabIndicator,
            focused && { backgroundColor: palette.brand },
          ]}
        >
          <Ionicons
            name={focused ? activeIcon : inactiveIcon}
            size={20}
            color={focused ? palette.onBrand : palette.textMuted}
          />
        </View>
      ),
    };
  }

  return (
    <AuthContext.Provider value={contextValue}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Tabs
          initialRouteName={isAuthenticated ? 'alerts' : 'login'}
          screenOptions={{
            headerShown: false,
            tabBarHideOnKeyboard: true,
            sceneStyle: { backgroundColor: palette.background },
            tabBarStyle: hideTabBar ? { display: 'none' } : tabBarStyle,
            tabBarActiveTintColor: palette.text,
            tabBarInactiveTintColor: palette.textMuted,
            tabBarLabelStyle: {
              fontFamily: FONTS.medium,
              fontSize: 12,
              marginTop: 2,
            },
            tabBarItemStyle: {
              minHeight: 52,
            },
          }}
        >
          <Tabs.Screen name="alerts" options={tabOptions('alerts')} />
          <Tabs.Screen name="analytics" options={tabOptions('analytics')} />
          <Tabs.Screen name="settings" options={tabOptions('settings')} />
          <Tabs.Screen name="profile" options={tabOptions('profile')} />
          <Tabs.Screen name="index" options={{ href: null }} />
          <Tabs.Screen name="history" options={{ href: null }} />
          <Tabs.Screen name="logs" options={{ href: null }} />
          <Tabs.Screen name="login" options={{ href: null }} />
          <Tabs.Screen name="change-password" options={{ href: null }} />
          <Tabs.Screen name="alert/[id]" options={{ href: null }} />
          <Tabs.Screen name="notifications/test" options={{ href: null }} />
        </Tabs>
      </ThemeProvider>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIndicator: {
    width: 56,
    height: 28,
    borderRadius: RADIUS.panel + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
