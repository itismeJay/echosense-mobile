import { router } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { roleLabel } from '../lib/access';
import { getApiHost } from '../lib/apiConfig';
import { logout } from '../lib/auth';
import { APP_VERSION } from '../lib/constants';
import {
  clearPushRegistration,
  getPushDiagnostics,
  subscribeToPushRegistrationStatus,
  type PushDiagnostics,
} from '../lib/notifications';
import { getServerUrl } from '../lib/server';
import { describeServer } from '../lib/serverConfig';
import { FONTS, SPACE, TYPE } from '../lib/theme';
import { makeStyles } from '../lib/useTheme';
import {
  Button,
  Card,
  Divider,
  InfoRow,
  ScreenHeader,
  SectionTitle,
} from '../components/ui';
import { AuthContext } from './_layout';

export default function ProfileScreen() {
  const { user, onSignOut } = useContext(AuthContext);
  const styles = useStyles();
  const [pushDiagnostics, setPushDiagnostics] =
    useState<PushDiagnostics | null>(null);
  const serverUrl = getServerUrl();

  useEffect(() => {
    let active = true;
    async function loadDiagnostics() {
      const diagnostics = await getPushDiagnostics(user?.id ?? null);
      if (active) setPushDiagnostics(diagnostics);
    }
    void loadDiagnostics();
    const unsubscribe = subscribeToPushRegistrationStatus(() => {
      void loadDiagnostics();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user?.id]);

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
            try {
              await clearPushRegistration();
              await logout();
              // The root layout moves a signed-out user to the login screen.
              onSignOut();
            } catch {
              Alert.alert(
                'Couldn’t sign out safely',
                'EchoSense could not detach this device from your account. Check your connection and try again.'
              );
            }
          },
        },
      ]
    );
  }

  const permissionLabel =
    pushDiagnostics?.permissionStatus === 'granted'
      ? 'Allowed on this device'
      : pushDiagnostics?.permissionStatus === 'denied'
        ? 'Turned off in device settings'
        : pushDiagnostics?.permissionStatus === 'undetermined'
          ? 'Not decided yet'
          : 'Status unavailable';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Profile" />

        <Card>
          <Text style={styles.email}>
            {user?.email || 'Signed-in account'}
          </Text>
          <Text style={styles.role}>
            {roleLabel(user)}
            {user?.is_super_admin ? ' · All schools' : ''}
          </Text>
        </Card>

        <View style={styles.section}>
          <SectionTitle>Account</SectionTitle>
          <Card>
            <Button
              label="Change password"
              icon="key-outline"
              onPress={() => router.push('/change-password')}
            />
            <Button
              label="Sign out"
              icon="log-out-outline"
              variant="danger"
              onPress={handleSignOut}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <SectionTitle>Server</SectionTitle>
          <Card>
            <InfoRow label="Connected to" value={describeServer(serverUrl)} />
            <Divider />
            <InfoRow label="Address" value={getApiHost(serverUrl)} selectable />
            <Text style={styles.note}>
              To use a different server, sign out and choose it on the sign-in
              screen.
            </Text>
          </Card>
        </View>

        <View style={styles.section}>
          <SectionTitle>Notifications</SectionTitle>
          <Card>
            <InfoRow label="Notification permission" value={permissionLabel} />
            <Divider />
            <InfoRow
              label="This device"
              value={
                pushDiagnostics?.expoTokenRegistered === true
                  ? 'Registered to receive alerts'
                  : pushDiagnostics?.expoTokenRegistered === false
                    ? 'Not registered yet'
                    : 'Status unavailable'
              }
            />
            <Divider />
            <InfoRow
              label="Last registration"
              value={formatRegistrationStatus(
                pushDiagnostics?.lastRegistrationStatus
              )}
            />
            <Divider />
            <InfoRow
              label="Build"
              value={
                pushDiagnostics?.supportedBuild
                  ? pushDiagnostics.physicalDevice
                    ? 'Supports notifications'
                    : 'Notifications need a physical device'
                  : 'Notifications aren’t available in Expo Go'
              }
            />
            {Platform.OS === 'ios' ? (
              <>
                <Divider />
                <InfoRow
                  label="Sound permission"
                  value={
                    pushDiagnostics?.iosSoundPermission === 'allowed'
                      ? 'Allowed'
                      : pushDiagnostics?.iosSoundPermission === 'not-allowed'
                        ? 'Not allowed'
                        : 'Unavailable'
                  }
                />
              </>
            ) : null}
            <Text style={styles.note}>
              Every alert plays a sound. Lock-screen sound also depends on this
              device’s notification settings.
            </Text>
          </Card>
        </View>

        <Text style={styles.version}>EchoSense {APP_VERSION}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatRegistrationStatus(status: string | undefined): string {
  switch (status) {
    case undefined:
    case 'not-attempted':
      return 'Not checked yet';
    case 'registered':
    case 'already-registered':
      return 'Ready';
    case 'password-change-pending':
      return 'Waiting for your password change';
    case 'permission-denied':
      return 'Notifications are turned off';
    case 'not-authenticated':
      return 'Signed out';
    default: {
      const words = status.replace(/-/g, ' ');
      return words.charAt(0).toUpperCase() + words.slice(1);
    }
  }
}

const useStyles = makeStyles((palette) => ({
  safe: {
    flex: 1,
    backgroundColor: palette.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: SPACE.lg,
    paddingBottom: SPACE.xxl,
    gap: SPACE.xl,
  },
  email: {
    color: palette.text,
    fontFamily: FONTS.semibold,
    ...TYPE.bodyLarge,
  },
  role: {
    color: palette.textMuted,
    fontFamily: FONTS.regular,
    ...TYPE.body,
    marginTop: -SPACE.sm,
  },
  section: {
    gap: SPACE.sm,
  },
  note: {
    color: palette.textMuted,
    fontFamily: FONTS.regular,
    ...TYPE.small,
  },
  version: {
    color: palette.textMuted,
    fontFamily: FONTS.regular,
    ...TYPE.small,
    textAlign: 'center',
  },
}));
