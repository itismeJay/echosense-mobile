import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === 'storeClient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchAlerts,
  fetchStats,
} from '../lib/api';
import { getNotifPrefs } from '../lib/notifications';
import {
  COLORS,
  REFRESH_INTERVAL_MS,
  DETECTION_RECENCY_THRESHOLD_MS,
} from '../lib/constants';
import type { Alert, LogStats } from '../lib/types';
import StatCard from '../components/StatCard';
import AlertCard from '../components/AlertCard';
import DetectionStatus from '../components/DetectionStatus';
import AudioVisualizer from '../components/AudioVisualizer';
import LoadingScreen from '../components/LoadingScreen';

async function sendAlertNotification(alert: Alert): Promise<void> {
  const isHigh = alert.severity === 'high';

  if (!isHigh) {
    const prefs = await getNotifPrefs();
    if (alert.severity === 'medium' && !prefs.medium) return;
    if (alert.severity === 'low' && !prefs.low) return;
  }

  const severityLabel = alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1);
  const content = {
    title: 'EchoSense',
    body: `${severityLabel} severity detected at ${alert.location}`,
    sound: true,
    data: { isHigh, alertId: alert.id },
  };
  const channelId = isHigh ? 'high-alerts' : 'other-alerts';

  await Notifications.scheduleNotificationAsync({
    content,
    trigger: Platform.OS === 'android'
      ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId }
      : null,
  });

  if (isHigh) {
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: Platform.OS === 'android'
        ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10, channelId }
        : { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10 },
    });
  }
}

export default function Dashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seenAlertIds = useRef<Set<number>>(new Set());
  const isFirstLoad = useRef(true);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    if (!showRefresh && isFirstLoad.current) {
      slowTimer.current = setTimeout(() => setSlowLoad(true), 6000);
    }
    try {
      const [alertsData, statsData] = await Promise.all([
        fetchAlerts(),
        fetchStats(),
      ]);

      if (isFirstLoad.current) {
        alertsData.forEach((a) => seenAlertIds.current.add(a.id));
        isFirstLoad.current = false;
      } else {
        const newAlerts = alertsData.filter((a) => !seenAlertIds.current.has(a.id));
        alertsData.forEach((a) => seenAlertIds.current.add(a.id));
        for (const alert of newAlerts) {
          await sendAlertNotification(alert);
        }
      }

      setAlerts(alertsData);
      setStats(statsData);
      setOnline(true);
      setError(null);
    } catch {
      setError('Failed to load data. Check your connection.');
      setOnline(false);
    } finally {
      if (slowTimer.current) {
        clearTimeout(slowTimer.current);
        slowTimer.current = null;
      }
      setSlowLoad(false);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const latestAlert = alerts[0] ?? null;
  const isDetected = latestAlert
    ? Date.now() - new Date(latestAlert.created_at).getTime() <
      DETECTION_RECENCY_THRESHOLD_MS
    : false;

  if (loading) {
    return (
      <LoadingScreen
        message={slowLoad ? 'Server is waking up, please wait...' : 'Connecting to EchoSense...'}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={COLORS.accent}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>EchoSense</Text>
          <View style={styles.onlineRow}>
            <View
              style={[
                styles.dot,
                { backgroundColor: online ? COLORS.low : COLORS.high },
              ]}
            />
            <Text
              style={[
                styles.onlineLabel,
                { color: online ? COLORS.low : COLORS.high },
              ]}
            >
              {online ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        {/* Detection Status */}
        <DetectionStatus detected={isDetected} />

        {/* Audio Visualizer Card */}
        <View style={styles.vizCard}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <Text style={styles.cardLabel}>Audio Activity</Text>
          <AudioVisualizer active={isDetected} />
        </View>

        {/* Stats Grid */}
        {stats && (
          <View style={styles.statsGrid}>
            <StatCard
              label="Total Detections"
              value={stats.total_alerts}
              color={COLORS.accent}
              icon="analytics"
            />
            <StatCard
              label="High Severity"
              value={stats.high_severity}
              color={COLORS.high}
              icon="alert-circle"
            />
            <StatCard
              label="Medium Severity"
              value={stats.medium_severity}
              color={COLORS.medium}
              icon="warning"
            />
            <StatCard
              label="Low Severity"
              value={stats.low_severity}
              color={COLORS.low}
              icon="information-circle"
            />
          </View>
        )}

        {/* Latest Detection */}
        {latestAlert && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Latest Detection</Text>
            <AlertCard alert={latestAlert} />
          </View>
        )}

        {/* Error State */}
        {error && (
          <View style={styles.errorBox}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <Ionicons
              name="cloud-offline-outline"
              size={28}
              color={COLORS.high}
            />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => load()}
              activeOpacity={0.8}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: -0.5,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlineLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  vizCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
    paddingVertical: 20,
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 12,
  },
  cardLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginVertical: 8,
  },
  section: {
    marginTop: 8,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  errorBox: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${COLORS.high}44`,
    backgroundColor: `${COLORS.high}11`,
    padding: 20,
    marginTop: 12,
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 4,
  },
  retryText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 14,
  },
  bottomPad: {
    height: 20,
  },
});
