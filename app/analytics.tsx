import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { fetchStats } from '../lib/api';
import {
  COLORS,
  RADII,
  SPACING,
  TYPOGRAPHY,
} from '../lib/constants';
import { canViewReports } from '../lib/presentation';
import type { LogStats } from '../lib/types';
import LoadingScreen from '../components/LoadingScreen';
import ScreenState from '../components/ScreenState';
import StatCard from '../components/StatCard';
import { AuthContext } from './_layout';

export default function ReportsScreen() {
  const { user } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      setStats(await fetchStats());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (canViewReports(user?.role)) load();
    else setLoading(false);
  }, [load, user?.role]);

  const chartWidth = Math.max(240, Math.min(width - 56, 640));
  const total = stats?.total_alerts ?? 0;
  const chartData = useMemo(
    () => ({
      labels: ['High', 'Medium', 'Low'],
      datasets: [
        {
          data: [
            stats?.high_severity ?? 0,
            stats?.medium_severity ?? 0,
            stats?.low_severity ?? 0,
          ],
        },
      ],
    }),
    [stats]
  );

  if (loading) {
    return <LoadingScreen message="Loading alert reports…" />;
  }

  if (!canViewReports(user?.role)) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.state}>
          <ScreenState
            icon="lock-closed-outline"
            title="Reports aren’t available for this account."
            message="Your classroom alerts and history are still available from the main navigation."
            actionLabel="Go to home"
            onAction={() => router.replace('/')}
          />
        </View>
      </SafeAreaView>
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
          <Text accessibilityRole="header" style={styles.title}>
            Reports
          </Text>
          <Text style={styles.subtitle}>
            A summary of the available alert history.
          </Text>
        </View>

        {error && !stats ? (
          <ScreenState
            icon="cloud-offline-outline"
            title="We couldn’t load alert reports."
            message="Check your connection and try again."
            actionLabel="Try again"
            onAction={() => load()}
            tone="error"
          />
        ) : (
          <>
            {error ? (
              <View style={styles.inlineError} accessibilityRole="alert">
                <Ionicons
                  name="cloud-offline-outline"
                  size={20}
                  color={COLORS.danger}
                  importantForAccessibility="no-hide-descendants"
                />
                <Text style={styles.inlineErrorText}>
                  This summary may be out of date.
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Try loading reports again"
                  style={styles.retryButton}
                  onPress={() => load()}
                >
                  <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.summaryGrid}>
              <StatCard
                label="All alerts"
                value={total}
                color={COLORS.primary}
                icon="documents-outline"
              />
              <StatCard
                label="High priority"
                value={stats?.high_severity ?? 0}
                color={COLORS.danger}
                icon="alert-circle-outline"
              />
              <StatCard
                label="Medium priority"
                value={stats?.medium_severity ?? 0}
                color={COLORS.warning}
                icon="warning-outline"
              />
              <StatCard
                label="Low priority"
                value={stats?.low_severity ?? 0}
                color={COLORS.information}
                icon="information-circle-outline"
              />
            </View>

            <View style={styles.chartCard}>
              <Text accessibilityRole="header" style={styles.chartTitle}>
                Alerts by priority
              </Text>
              <Text style={styles.chartDescription}>
                Counts reflect the current history summary from EchoSense.
              </Text>
              {total > 0 ? (
                <View
                  accessible
                  accessibilityRole="image"
                  accessibilityLabel={`Alert counts by priority. High ${
                    stats?.high_severity ?? 0
                  }, medium ${stats?.medium_severity ?? 0}, low ${
                    stats?.low_severity ?? 0
                  }.`}
                >
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chartScroll}
                    importantForAccessibility="no-hide-descendants"
                  >
                    <BarChart
                      data={chartData}
                      width={chartWidth}
                      height={220}
                      chartConfig={{
                        backgroundColor: COLORS.surface,
                        backgroundGradientFrom: COLORS.surface,
                        backgroundGradientTo: COLORS.surface,
                        decimalPlaces: 0,
                        color: () => COLORS.primary,
                        labelColor: () => COLORS.textSecondary,
                        propsForBackgroundLines: {
                          stroke: COLORS.border,
                          strokeDasharray: '',
                        },
                      }}
                      style={styles.chart}
                      showValuesOnTopOfBars
                      withInnerLines
                      fromZero
                      yAxisLabel=""
                      yAxisSuffix=""
                    />
                  </ScrollView>
                </View>
              ) : (
                <ScreenState
                  icon="bar-chart-outline"
                  title="No alert history is available yet."
                  message="This report will update when alerts are available."
                />
              )}
            </View>
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
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.lg,
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
  state: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    backgroundColor: COLORS.offlineBackground,
  },
  inlineErrorText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.secondary,
  },
  retryButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  retryText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '700',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  chartCard: {
    overflow: 'hidden',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    gap: SPACING.xs,
  },
  chartTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '700',
    paddingHorizontal: SPACING.xs,
    paddingTop: SPACING.xs,
  },
  chartDescription: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 19,
    paddingHorizontal: SPACING.xs,
  },
  chartScroll: {
    minWidth: '100%',
    justifyContent: 'center',
  },
  chart: {
    borderRadius: RADII.md,
    marginTop: SPACING.sm,
  },
});
