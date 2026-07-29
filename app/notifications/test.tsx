import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useContext } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '../../lib/constants';
import { maskProviderTestId } from '../../lib/notificationNavigation';
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
          <View style={styles.icon}>
            <Ionicons
              name="checkmark-circle-outline"
              size={42}
              color={COLORS.success}
              importantForAccessibility="no-hide-descendants"
            />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            Notification test received
          </Text>
          <Text style={styles.message}>
            This controlled test confirms that the approved device received an
            EchoSense notification. No classroom alert was created.
          </Text>
        </View>

        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Delivery details
          </Text>
          <MetadataRow
            label="Test reference"
            value={testId ? maskProviderTestId(testId) : 'Unavailable'}
          />
          <View style={styles.divider} />
          <MetadataRow
            label="Received on this device"
            value={formatReceivedAt(receivedAt)}
          />
          <View style={styles.divider} />
          <MetadataRow
            label="Device platform"
            value={
              Platform.OS === 'ios'
                ? 'iOS'
                : Platform.OS === 'android'
                  ? 'Android'
                  : 'Web or unsupported test environment'
            }
          />
        </View>

        <View style={styles.notice}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color={COLORS.primary}
            importantForAccessibility="no-hide-descendants"
          />
          <Text style={styles.noticeText}>
            This screen verifies mobile delivery and navigation only. It is
            separate from classroom alert review.
          </Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Return to EchoSense home"
          activeOpacity={0.75}
          style={styles.button}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.buttonText}>Return to home</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetadataRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metadataRow}>
      <Text style={styles.metadataLabel}>{label}</Text>
      <Text selectable style={styles.metadataValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    gap: SPACING.xl,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  hero: {
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.xl,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.successBackground,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.screenTitle,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    maxWidth: 520,
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 24,
    textAlign: 'center',
  },
  card: {
    gap: SPACING.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
  },
  metadataRow: {
    gap: SPACING.xs,
  },
  metadataLabel: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  metadataValue: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    lineHeight: 21,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.lg,
    borderRadius: RADII.md,
    backgroundColor: COLORS.informationBackground,
  },
  noticeText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.secondary,
    lineHeight: 21,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
  },
});
