import { router } from 'expo-router';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { canViewSystemInfo, roleLabel } from '../lib/access';
import { checkConnectivity } from '../lib/api';
import { getApiHost } from '../lib/apiConfig';
import {
  APP_ENVIRONMENT,
  APP_VERSION,
  CAPSTONE_YEAR,
  SCHOOL,
  TEAM,
} from '../lib/constants';
import { getServerUrl } from '../lib/server';
import { describeServer } from '../lib/serverConfig';
import { FONTS, SPACE, TYPE } from '../lib/theme';
import { makeStyles, useTheme } from '../lib/useTheme';
import ScreenState from '../components/ScreenState';
import {
  Button,
  Card,
  Divider,
  InfoRow,
  ScreenHeader,
  SectionTitle,
} from '../components/ui';
import { AuthContext } from './_layout';

export default function SystemInformationScreen() {
  const { user } = useContext(AuthContext);
  const palette = useTheme();
  const styles = useStyles();
  const [connected, setConnected] = useState<boolean | null>(null);
  const allowed = canViewSystemInfo(user);
  const serverUrl = getServerUrl();

  const check = useCallback(async () => {
    setConnected(null);
    setConnected(await checkConnectivity());
  }, []);

  useEffect(() => {
    if (allowed) void check();
  }, [allowed, check]);

  if (!allowed) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.denied}>
          <ScreenState
            icon="lock-closed-outline"
            title="System info is for administrators."
            message="Your alerts are on the Alerts tab."
            actionLabel="Go to alerts"
            onAction={() => router.replace('/alerts')}
          />
        </View>
      </SafeAreaView>
    );
  }

  const statusLabel =
    connected === null ? 'Checking…' : connected ? 'Connected' : 'Not reachable';
  const statusColor =
    connected === false ? palette.danger : connected ? palette.link : palette.textMuted;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="System info"
          subtitle={`Connection and app details. Signed in as ${roleLabel(user).toLowerCase()}.`}
        />

        <View style={styles.section}>
          <SectionTitle>Server</SectionTitle>
          <Card>
            <View
              style={styles.statusRow}
              accessible
              accessibilityLabel={`Server status: ${statusLabel}`}
              accessibilityLiveRegion="polite"
            >
              <View style={styles.statusCopy}>
                <Text style={styles.label}>Status</Text>
                <Text style={[styles.status, { color: statusColor }]}>
                  {statusLabel}
                </Text>
              </View>
              <Button
                label="Check again"
                onPress={check}
                pending={connected === null}
                accessibilityLabel="Check the server connection again"
              />
            </View>
            <Divider />
            <InfoRow label="Server" value={describeServer(serverUrl)} />
            <Divider />
            <InfoRow label="Address" value={getApiHost(serverUrl)} selectable />
          </Card>
        </View>

        <View style={styles.section}>
          <SectionTitle>App</SectionTitle>
          <Card>
            <InfoRow label="Version" value={`EchoSense ${APP_VERSION}`} />
            <Divider />
            <InfoRow label="Build" value={APP_ENVIRONMENT} />
            <Divider />
            <InfoRow label="Framework" value="Expo SDK 54, React Native" />
          </Card>
        </View>

        <View style={styles.section}>
          <SectionTitle>Project</SectionTitle>
          <Card>
            <InfoRow label="Institution" value={SCHOOL} />
            <Divider />
            <InfoRow label="Capstone year" value={CAPSTONE_YEAR} />
            <Divider />
            <InfoRow label="Development team" value={TEAM.join('\n')} />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((palette) => ({
  safe: {
    flex: 1,
    backgroundColor: palette.background,
  },
  flex: {
    flex: 1,
  },
  denied: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACE.lg,
  },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: SPACE.lg,
    paddingBottom: SPACE.xxl,
    gap: SPACE.xl,
  },
  section: {
    gap: SPACE.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.md,
  },
  statusCopy: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: palette.textMuted,
    fontFamily: FONTS.regular,
    ...TYPE.small,
  },
  status: {
    fontFamily: FONTS.semibold,
    ...TYPE.bodyLarge,
  },
}));
