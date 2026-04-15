import '../global.css';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { COLORS } from '../lib/constants';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0d0d1a',
            borderTopColor: 'rgba(255,255,255,0.08)',
            borderTopWidth: 1,
            height: 64,
            paddingBottom: 10,
            paddingTop: 6,
          },
          tabBarActiveTintColor: COLORS.accent,
          tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
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
      </Tabs>
    </>
  );
}
