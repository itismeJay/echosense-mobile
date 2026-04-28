import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { checkConnectivity } from '../lib/api';
import { logout } from '../lib/auth';
import { AuthContext } from './_layout';
import {
  COLORS,
  API_BASE_URL,
  TEAM,
  SCHOOL,
  CAPSTONE_YEAR,
  APP_VERSION,
} from '../lib/constants';

export default function Settings() {
  const { onSignOut } = useContext(AuthContext);
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    checkConnectivity().then(setConnected);
  }, []);

  function handleLogout() {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>

        {/* Connection Section */}
        <SectionCard title="Connection">
          <InfoRow
            icon="globe-outline"
            label="API Endpoint"
            value={API_BASE_URL.replace('https://', '')}
          />
          <View style={styles.divider} />
          <View style={styles.row}>
            <Ionicons
              name="wifi-outline"
              size={16}
              color={COLORS.textMuted}
            />
            <Text style={styles.rowLabel}>Status</Text>
            <View style={styles.rowRight}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      connected === null
                        ? COLORS.textDim
                        : connected
                        ? COLORS.low
                        : COLORS.high,
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      connected === null
                        ? COLORS.textDim
                        : connected
                        ? COLORS.low
                        : COLORS.high,
                  },
                ]}
              >
                {connected === null
                  ? 'Checking...'
                  : connected
                  ? 'Connected'
                  : 'Unreachable'}
              </Text>
            </View>
          </View>
        </SectionCard>

        {/* About Section */}
        <SectionCard title="About">
          <InfoRow icon="layers-outline" label="App" value={`EchoSense v${APP_VERSION}`} />
          <View style={styles.divider} />
          <InfoRow icon="school-outline" label="Institution" value={SCHOOL} />
          <View style={styles.divider} />
          <InfoRow icon="calendar-outline" label="Capstone Year" value={CAPSTONE_YEAR} />
        </SectionCard>

        {/* Team Section */}
        <SectionCard title="Development Team">
          {TEAM.map((name, idx) => (
            <View key={name}>
              <View style={styles.row}>
                <View style={styles.avatarCircle}>
                  <Ionicons name="person" size={14} color={COLORS.accent} />
                </View>
                <Text style={styles.teamName}>{name}</Text>
              </View>
              {idx < TEAM.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </SectionCard>

        {/* System Section */}
        <SectionCard title="System">
          <InfoRow
            icon="phone-portrait-outline"
            label="Platform"
            value="iOS & Android"
          />
          <View style={styles.divider} />
          <InfoRow
            icon="code-slash-outline"
            label="Framework"
            value="Expo SDK 54 / React Native"
          />
        </SectionCard>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.high} />
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.cardBody}>{children}</View>
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
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={COLORS.textMuted} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
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
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.4,
    marginBottom: 20,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  rowLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    flex: 1,
  },
  rowValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
    maxWidth: '55%',
    textAlign: 'right',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 2,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${COLORS.accent}22`,
    borderWidth: 1,
    borderColor: `${COLORS.accent}44`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamName: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${COLORS.high}44`,
    backgroundColor: `${COLORS.high}11`,
    paddingVertical: 14,
    marginBottom: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.high,
  },
});
