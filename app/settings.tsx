import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { checkConnectivity } from '../lib/api';
import {
  API_HOST,
  APP_VERSION,
  CAPSTONE_YEAR,
  COLORS,
  RADII,
  SCHOOL,
  SPACING,
  TEAM,
  TYPOGRAPHY,
} from '../lib/constants';
import ScreenState from '../components/ScreenState';
import { AuthContext } from './_layout';

export default function SystemInformationScreen() {
  const { user } = useContext(AuthContext);
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    if (user?.role === 'admin') checkConnectivity().then(setConnected);
  }, [user?.role]);

  if (user?.role !== 'admin') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.deniedState}>
          <ScreenState
            icon="lock-closed-outline"
            title="System information is administrator-only."
            actionLabel="Back to profile"
            onAction={() => router.replace('/profile')}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back to profile"
          style={styles.backButton}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/profile')
          }
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={COLORS.text}
            importantForAccessibility="no-hide-descendants"
          />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>System information</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Administrator details
          </Text>
          <Text style={styles.subtitle}>
            Technical mobile application information is kept separate from the
            teacher experience.
          </Text>
        </View>

        <Section title="Mobile service connection">
          <View
            style={styles.connectionRow}
            accessible
            accessibilityLabel={`Mobile service connection: ${
              connected === null
                ? 'Checking'
                : connected
                  ? 'Connected'
                  : 'Unavailable'
            }`}
          >
            <View
              style={[
                styles.connectionIcon,
                {
                  backgroundColor:
                    connected === false
                      ? COLORS.dangerBackground
                      : connected
                        ? COLORS.successBackground
                        : COLORS.surfaceSecondary,
                },
              ]}
            >
              <Ionicons
                name={
                  connected === false
                    ? 'cloud-offline-outline'
                    : 'cloud-done-outline'
                }
                size={22}
                color={
                  connected === false
                    ? COLORS.danger
                    : connected
                      ? COLORS.success
                      : COLORS.textSecondary
                }
                importantForAccessibility="no-hide-descendants"
              />
            </View>
            <View style={styles.connectionCopy}>
              <Text style={styles.rowLabel}>API connection</Text>
              <Text
                style={[
                  styles.connectionStatus,
                  connected === false && { color: COLORS.danger },
                  connected === true && { color: COLORS.success },
                ]}
              >
                {connected === null
                  ? 'Checking…'
                  : connected
                    ? 'Connected'
                    : 'Unavailable'}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Check the mobile service connection again"
              style={styles.checkButton}
              onPress={async () => {
                setConnected(null);
                setConnected(await checkConnectivity());
              }}
            >
              <Text style={styles.checkButtonText}>Check again</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          <InfoRow
            icon="globe-outline"
            label="API host"
            value={API_HOST}
          />
        </Section>

        <Section title="Application">
          <InfoRow
            icon="phone-portrait-outline"
            label="Mobile app"
            value={`EchoSense ${APP_VERSION}`}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="layers-outline"
            label="Framework"
            value="Expo SDK 54 / React Native"
          />
          <View style={styles.divider} />
          <InfoRow
            icon="phone-portrait-outline"
            label="Platforms"
            value="iOS and Android"
          />
        </Section>

        <Section title="Project">
          <InfoRow
            icon="school-outline"
            label="Institution"
            value={SCHOOL}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="calendar-outline"
            label="Capstone year"
            value={CAPSTONE_YEAR}
          />
          <View style={styles.divider} />
          <View style={styles.teamBlock}>
            <Text style={styles.rowLabel}>Development team</Text>
            {TEAM.map((name) => (
              <Text key={name} style={styles.teamName}>
                {name}
              </Text>
            ))}
          </View>
        </Section>
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
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View
      style={styles.infoRow}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Ionicons
        name={icon}
        size={20}
        color={COLORS.textSecondary}
        importantForAccessibility="no-hide-descendants"
      />
      <View style={styles.infoCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} selectable>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  topBarTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
  },
  topBarSpacer: {
    width: 44,
  },
  screen: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.xl,
  },
  header: {
    gap: SPACING.xs,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.screenTitle,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.secondary,
    lineHeight: 21,
  },
  deniedState: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
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
  connectionRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  connectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionCopy: {
    flex: 1,
    gap: 2,
  },
  connectionStatus: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  checkButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  checkButtonText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  infoRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  infoCopy: {
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
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  teamBlock: {
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
  },
  teamName: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.secondary,
    lineHeight: 21,
  },
});
