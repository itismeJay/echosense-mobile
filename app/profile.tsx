import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { logout } from '../lib/auth';
import {
  COLORS,
  APP_VERSION,
  RADII,
  SPACING,
  TYPOGRAPHY,
} from '../lib/constants';
import { getNotifPrefs, saveNotifPrefs } from '../lib/notifications';
import { getRoleLabel } from '../lib/presentation';
import { AuthContext } from './_layout';

export default function ProfileScreen() {
  const { user, onSignOut } = useContext(AuthContext);
  const [notificationPermission, setNotificationPermission] =
    useState<Notifications.PermissionStatus | null>(null);
  const [mediumPriority, setMediumPriority] = useState(true);
  const [lowPriority, setLowPriority] = useState(true);

  useEffect(() => {
    async function loadPreferences() {
      const [permission, preferences] = await Promise.all([
        Notifications.getPermissionsAsync().catch(() => null),
        getNotifPrefs(),
      ]);
      setNotificationPermission(permission?.status ?? null);
      setMediumPriority(preferences.medium);
      setLowPriority(preferences.low);
    }
    loadPreferences();
  }, []);

  async function toggleMedium(value: boolean) {
    setMediumPriority(value);
    await saveNotifPrefs({ medium: value, low: lowPriority });
  }

  async function toggleLow(value: boolean) {
    setLowPriority(value);
    await saveNotifPrefs({ medium: mediumPriority, low: value });
  }

  function handleSignOut() {
    Alert.alert(
      'Sign out of EchoSense?',
      'This clears your saved sign-in on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            onSignOut();
            router.replace('/login');
          },
        },
      ]
    );
  }

  const permissionLabel =
    notificationPermission === 'granted'
      ? 'Allowed on this device'
      : notificationPermission === 'denied'
        ? 'Turned off in device settings'
        : notificationPermission === 'undetermined'
          ? 'Not decided'
          : 'Status unavailable';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text accessibilityRole="header" style={styles.title}>
          Profile
        </Text>

        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Ionicons
              name="person-outline"
              size={30}
              color={COLORS.primary}
              importantForAccessibility="no-hide-descendants"
            />
          </View>
          <View style={styles.identityCopy}>
            <Text style={styles.email}>
              {user?.email || 'Signed-in staff account'}
            </Text>
            <Text style={styles.role}>{getRoleLabel(user?.role)}</Text>
          </View>
        </View>

        <Section title="Notifications">
          <InfoRow
            icon="notifications-outline"
            label="Notification status"
            value={permissionLabel}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="alert-circle-outline"
            iconColor={COLORS.danger}
            label="High-priority alerts"
            value={
              notificationPermission === 'granted'
                ? 'Allowed by device settings'
                : 'Requires device permission'
            }
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="warning-outline"
            iconColor={COLORS.warning}
            label="Medium-priority alerts"
            value={mediumPriority}
            onValueChange={toggleMedium}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="information-circle-outline"
            iconColor={COLORS.information}
            label="Low-priority alerts"
            value={lowPriority}
            onValueChange={toggleLow}
          />
          <Text style={styles.notificationNote}>
            These preferences apply to notifications the app can identify by
            priority. Device notification settings also apply.
          </Text>
        </Section>

        <Section title="About">
          <InfoRow
            icon="phone-portrait-outline"
            label="Application"
            value={`EchoSense ${APP_VERSION}`}
          />
        </Section>

        {user?.role === 'admin' ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open administrator system information"
            style={styles.adminLink}
            onPress={() => router.push('/settings')}
            activeOpacity={0.75}
          >
            <View style={styles.adminLinkCopy}>
              <Ionicons
                name="settings-outline"
                size={22}
                color={COLORS.primary}
                importantForAccessibility="no-hide-descendants"
              />
              <View style={styles.adminLinkText}>
                <Text style={styles.adminLinkTitle}>System information</Text>
                <Text style={styles.adminLinkSubtitle}>
                  Administrator-only connection and application details
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={COLORS.textSecondary}
              importantForAccessibility="no-hide-descendants"
            />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.75}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color={COLORS.danger}
            importantForAccessibility="no-hide-descendants"
          />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function InfoRow({
  icon,
  iconColor = COLORS.textSecondary,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  value: string;
}) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Ionicons
        name={icon}
        size={20}
        color={iconColor}
        importantForAccessibility="no-hide-descendants"
      />
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

function ToggleRow({
  icon,
  iconColor,
  label,
  value,
  onValueChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Ionicons
        name={icon}
        size={20}
        color={iconColor}
        importantForAccessibility="no-hide-descendants"
      />
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        accessibilityRole="switch"
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: COLORS.border, true: COLORS.primarySoft }}
        thumbColor={value ? COLORS.primary : COLORS.textMuted}
        ios_backgroundColor={COLORS.border}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screen: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.xl,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.screenTitle,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.informationBackground,
  },
  identityCopy: {
    flex: 1,
    gap: SPACING.xs,
  },
  email: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '700',
    lineHeight: 23,
  },
  role: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.secondary,
  },
  section: {
    gap: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '700',
  },
  card: {
    overflow: 'hidden',
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
  },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '600',
    lineHeight: 20,
  },
  rowValue: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 19,
  },
  toggleLabel: {
    flex: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '600',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  notificationNote: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 19,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  adminLink: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
  },
  adminLinkCopy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  adminLinkText: {
    flex: 1,
    gap: 2,
  },
  adminLinkTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
  },
  adminLinkSubtitle: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 19,
  },
  signOutButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.offlineBackground,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: RADII.md,
  },
  signOutText: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
  },
});
