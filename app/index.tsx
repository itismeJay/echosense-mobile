import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchAlerts } from '../lib/api';
import {
  COLORS,
  MAX_ALERTS_IN_MEMORY,
  RADII,
  REFRESH_INTERVAL_MS,
  SPACING,
  TYPOGRAPHY,
} from '../lib/constants';
import {
  getGreeting,
  isToday,
  sortAlertsNewestFirst,
} from '../lib/presentation';
import type { Alert } from '../lib/types';
import AlertCard from '../components/AlertCard';
import LoadingScreen from '../components/LoadingScreen';
import OfflineBanner from '../components/OfflineBanner';
import ScreenState from '../components/ScreenState';
import StatCard from '../components/StatCard';

export default function HomeScreen() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const inFlight = useRef(false);
  const isFirstLoad = useRef(true);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (showRefresh = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (showRefresh) setRefreshing(true);
    if (isFirstLoad.current) {
      slowTimer.current = setTimeout(() => setSlowLoad(true), 6000);
    }

    try {
      const data = await fetchAlerts();
      const newestFirst = sortAlertsNewestFirst(data).slice(
        0,
        MAX_ALERTS_IN_MEMORY
      );
      setAlerts(newestFirst);
      setLastUpdated(new Date());
      setError(false);
    } catch {
      setError(true);
    } finally {
      if (slowTimer.current) {
        clearTimeout(slowTimer.current);
        slowTimer.current = null;
      }
      inFlight.current = false;
      isFirstLoad.current = false;
      setSlowLoad(false);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      if (slowTimer.current) clearTimeout(slowTimer.current);
    };
  }, [load]);

  const todayAlerts = useMemo(
    () => alerts.filter((alert) => isToday(alert.created_at)),
    [alerts]
  );
  const highPriorityToday = useMemo(
    () =>
      todayAlerts.filter(
        (alert) => alert.severity?.toLowerCase() === 'high'
      ).length,
    [todayAlerts]
  );
  const recentAlerts = alerts.slice(0, 3);
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  if (loading) {
    return (
      <LoadingScreen
        message={
          slowLoad
            ? 'EchoSense is taking a little longer to respond…'
            : 'Loading classroom alerts…'
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.brand}>EchoSense</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {getGreeting()}
          </Text>
          <Text style={styles.subtitle}>What needs your attention today?</Text>
          <Text style={styles.date}>{todayLabel}</Text>
        </View>

        {error && alerts.length > 0 ? (
          <OfflineBanner lastUpdated={lastUpdated} />
        ) : null}

        {error && alerts.length === 0 ? (
          <ScreenState
            icon="cloud-offline-outline"
            title="We couldn’t load classroom alerts."
            message="Check your connection and try again."
            actionLabel="Try again"
            onAction={() => load()}
            tone="error"
          />
        ) : (
          <>
            <View style={styles.statsRow}>
              <StatCard
                label="Alerts today"
                value={todayAlerts.length}
                color={COLORS.primary}
                icon="notifications-outline"
              />
              <StatCard
                label="High priority"
                value={highPriorityToday}
                color={COLORS.danger}
                icon="alert-circle-outline"
              />
            </View>

            <View
              style={[
                styles.monitoringCard,
                error && styles.monitoringCardOffline,
              ]}
              accessible
              accessibilityLabel={
                error
                  ? 'Classroom monitoring status unavailable. EchoSense cannot connect right now.'
                  : 'Device check-in unavailable. EchoSense cannot confirm the classroom device latest check-in from this app.'
              }
            >
              <View
                style={[
                  styles.monitoringIcon,
                  error && styles.monitoringIconOffline,
                ]}
              >
                <Ionicons
                  name={error ? 'cloud-offline-outline' : 'hardware-chip-outline'}
                  size={24}
                  color={error ? COLORS.danger : COLORS.information}
                  importantForAccessibility="no-hide-descendants"
                />
              </View>
              <View style={styles.monitoringCopy}>
                <Text style={styles.monitoringEyebrow}>Classroom monitoring</Text>
                <Text style={styles.monitoringTitle}>
                  {error
                    ? 'Monitoring status unavailable'
                    : 'Device check-in unavailable'}
                </Text>
                <Text style={styles.monitoringMessage}>
                  {error
                    ? 'EchoSense can’t connect right now. Alerts may be delayed or unavailable.'
                    : 'The current mobile service does not provide a recent classroom device check-in.'}
                </Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleGroup}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Recent alerts
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Latest available classroom information
                </Text>
              </View>
            </View>

            {recentAlerts.length > 0 ? (
              recentAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  compact
                  onPress={() =>
                    router.push({
                      pathname: '/alert/[id]',
                      params: { id: String(alert.id) },
                    })
                  }
                />
              ))
            ) : (
              <ScreenState
                icon="checkmark-circle-outline"
                title="No new classroom alerts."
                message="New possible alerts will appear here when information is available."
              />
            )}
          </>
        )}
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
  },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.lg,
  },
  header: {
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  brand: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '700',
  },
  title: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.screenTitle,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  subtitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 23,
  },
  date: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.secondary,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  monitoringCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
  },
  monitoringCardOffline: {
    backgroundColor: COLORS.offlineBackground,
    borderColor: COLORS.dangerBorder,
  },
  monitoringIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.informationBackground,
  },
  monitoringIconOffline: {
    backgroundColor: COLORS.dangerBackground,
  },
  monitoringCopy: {
    flex: 1,
    gap: SPACING.xs,
  },
  monitoringEyebrow: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  monitoringTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '700',
    lineHeight: 23,
  },
  monitoringMessage: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.secondary,
    lineHeight: 21,
  },
  sectionHeader: {
    marginTop: SPACING.sm,
  },
  sectionTitleGroup: {
    gap: SPACING.xs,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.secondary,
  },
});
