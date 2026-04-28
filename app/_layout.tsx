import '../global.css';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, createContext, useMemo } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { COLORS } from '../lib/constants';
import { getToken, wakeup } from '../lib/auth';

export const AuthContext = createContext<{
  isAuthenticated: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}>({
  isAuthenticated: false,
  onSignIn: () => {},
  onSignOut: () => {},
});

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isHigh = notification.request.content.data?.isHigh === true;
    return {
      shouldShowAlert: true,
      shouldPlaySound: isHigh,
      shouldSetBadge: false,
    };
  },
});

const TAB_BAR_STYLE = {
  backgroundColor: '#0d0d1a',
  borderTopColor: 'rgba(255,255,255,0.08)',
  borderTopWidth: 1,
  height: 64,
  paddingBottom: 10,
  paddingTop: 6,
} as const;

export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    wakeup();
    async function setup() {
      const token = await getToken();
      setIsAuthenticated(!!token);
      setAuthChecked(true);
      if (!token) {
        router.replace('/login');
      }

      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;

      if (Platform.OS === 'android') {
        await Notifications.deleteNotificationChannelAsync('high-alerts');
        await Notifications.setNotificationChannelAsync('high-alerts', {
          name: 'High Severity Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          enableVibrate: true,
          vibrationPattern: [0, 80],
        });
        await Notifications.setNotificationChannelAsync('other-alerts', {
          name: 'Other Alerts',
          importance: Notifications.AndroidImportance.DEFAULT,
          sound: null,
          enableVibrate: false,
        });
      }
    }
    setup();
  }, []);

  const ctx = useMemo(
    () => ({
      isAuthenticated,
      onSignIn: () => setIsAuthenticated(true),
      onSignOut: () => setIsAuthenticated(false),
    }),
    [isAuthenticated]
  );

  return (
    <AuthContext.Provider value={ctx}>
      <StatusBar style="light" />
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle:
            route.name === 'login' || !authChecked || !isAuthenticated
              ? { display: 'none' }
              : TAB_BAR_STYLE,
          tabBarActiveTintColor: COLORS.accent,
          tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        })}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'pulse' : 'pulse-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="logs"
          options={{
            title: 'Logs',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'list' : 'list-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: 'Analytics',
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
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'settings' : 'settings-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen name="login" options={{ href: null }} />
      </Tabs>
    </AuthContext.Provider>
  );
}
