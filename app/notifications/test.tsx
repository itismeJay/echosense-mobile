import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useContext } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { maskProviderTestId } from '../../lib/notificationNavigation';
import { FONTS, SPACE, TYPE } from '../../lib/theme';
import { makeStyles, useTheme } from '../../lib/useTheme';
import { Button, Card, Divider, InfoRow, Notice, SectionTitle } from '../../components/ui';
import { AuthContext } from '../_layout';

function firstParam(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function formatReceivedAt(value: string | null): string {
  if (!value || Number.isNaN(Date.parse(value))) return 'Unavailable';
  return new Date(value).toLocaleString();
}

export default function NotificationTestScreen() {
  const { isAuthenticated } = useContext(AuthContext);
  const palette = useTheme();
  const styles = useStyles();
  const params = useLocalSearchParams<{
    testId?: string | string[];
    receivedAt?: string | string[];
  }>();

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const testId = firstParam(params.testId);
  const receivedAt = firstParam(params.receivedAt);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          accessible
          accessibilityLabel="Notification test received. No classroom alert was created."
          style={styles.hero}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={40}
            color={palette.link}
            importantForAccessibility="no-hide-descendants"
          />
          <Text accessibilityRole="header" style={styles.title}>
            Notification test received
          </Text>
          <Text style={styles.message}>
            This device received an EchoSense test notification. No classroom
            alert was created.
          </Text>
        </View>

        <View style={styles.section}>
          <SectionTitle>Delivery details</SectionTitle>
          <Card>
            <InfoRow
              label="Test reference"
              value={testId ? maskProviderTestId(testId) : 'Unavailable'}
              selectable
            />
            <Divider />
            <InfoRow
              label="Received on this device"
              value={formatReceivedAt(receivedAt)}
            />
            <Divider />
            <InfoRow
              label="Device platform"
              value={
                Platform.OS === 'ios'
                  ? 'iOS'
                  : Platform.OS === 'android'
                    ? 'Android'
                    : 'Web or unsupported test environment'
              }
            />
          </Card>
        </View>

        <Notice>
          This screen only checks that notifications arrive and open the app. It
          is separate from reviewing classroom alerts.
        </Notice>

        <Button
          label="Go to alerts"
          variant="primary"
          onPress={() => router.replace('/alerts')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((palette) => ({
  safe: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    flexGrow: 1,
    gap: SPACE.xl,
    padding: SPACE.lg,
    paddingBottom: SPACE.xxl,
  },
  hero: {
    gap: SPACE.sm,
    paddingTop: SPACE.xl,
  },
  title: {
    color: palette.text,
    fontFamily: FONTS.semibold,
    ...TYPE.display,
  },
  message: {
    color: palette.textMuted,
    fontFamily: FONTS.regular,
    ...TYPE.bodyLarge,
  },
  section: {
    gap: SPACE.sm,
  },
}));
