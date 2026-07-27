import '../global.css';
import { Tabs, router } from 'expo-router';
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
import { getToken, getUser, wakeup, type User } from '../lib/auth';
import { canViewReports } from '../lib/presentation';
import {
  getNotifPrefs,
  getNotificationAlertId,
  shouldHandleNotificationResponse,
  shouldPresentNotification,
} from '../lib/notifications';
import LoadingScreen from '../components/LoadingScreen';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

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
    const data = notification.request.content.data;
    const shouldPresent = shouldPresentNotification(data);
    const rawPriority = data?.priority ?? data?.severity;
    const priority =
      typeof rawPriority === 'string' ? rawPriority.toLowerCase() : null;
    const isHigh = data?.isHigh === true || priority === 'high';
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
  const insets = useSafeAreaInsets();

  useEffect(() => {
    wakeup();

    async function setup() {
      const token = await getToken();
      const restoredUser = token ? getUser(token) : null;
      setUser(restoredUser);
      setIsAuthenticated(Boolean(token));
      setAuthChecked(true);

      if (!token) {
        router.replace('/login');
      }

      if (!isExpoGo && Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('high-alerts', {
          name: 'High-priority classroom alerts',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          enableVibrate: true,
          vibrationPattern: [0, 80],
        });
        await Notifications.setNotificationChannelAsync('other-alerts', {
          name: 'Other classroom alerts',
          importance: Notifications.AndroidImportance.DEFAULT,
          sound: null,
          enableVibrate: false,
        });
      }
    }

    setup();

    const receivedSubscription =
      Notifications.addNotificationReceivedListener(() => {
        // Foreground presentation and ID deduplication are handled above.
      });
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (!shouldHandleNotificationResponse(data)) return;

        const alertId = getNotificationAlertId(data);
        if (alertId) {
          router.push({
            pathname: '/alert/[id]',
            params: { id: alertId },
          });
        } else {
          router.push('/alerts');
        }
      });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

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
