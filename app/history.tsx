import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { fetchLogs } from '../lib/api';
import {
  COLORS,
  MAX_ALERTS_IN_MEMORY,
  SPACING,
  TYPOGRAPHY,
} from '../lib/constants';
import {
  isToday,
  isWithinDays,
  normalizeSeverity,
  sortAlertsNewestFirst,
} from '../lib/presentation';
import type { Alert, Severity } from '../lib/types';
import AlertCard from '../components/AlertCard';
import FilterPill from '../components/FilterPill';
import LoadingScreen from '../components/LoadingScreen';
import OfflineBanner from '../components/OfflineBanner';
import ScreenState from '../components/ScreenState';

type PriorityFilter = 'all' | Severity;
type DateFilter = 'all' | 'today' | '7days';

const PRIORITY_FILTERS: { key: PriorityFilter; label: string }[] = [
  { key: 'all', label: 'All priorities' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'all', label: 'Any date' },
  { key: 'today', label: 'Today' },
  { key: '7days', label: 'Past 7 days' },
];

export default function HistoryScreen() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [priority, setPriority] = useState<PriorityFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const data = await fetchLogs();
      setAlerts(
        sortAlertsNewestFirst(data).slice(0, MAX_ALERTS_IN_MEMORY)
      );
      setLastUpdated(new Date());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredAlerts = useMemo(
    () =>
      alerts.filter((alert) => {
        const matchesPriority =
          priority === 'all' ||
          normalizeSeverity(alert.severity) === priority;
        const matchesDate =
          dateFilter === 'all' ||
          (dateFilter === 'today'
            ? isToday(alert.created_at)
            : isWithinDays(alert.created_at, 7));
        return matchesPriority && matchesDate;
      }),
    [alerts, dateFilter, priority]
  );
  const hasActiveFilters = priority !== 'all' || dateFilter !== 'all';

  if (loading) {
    return <LoadingScreen message="Loading alert history…" />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Alert history
          </Text>
          <Text style={styles.subtitle}>
            Previous automatically generated classroom alerts.
          </Text>
          <Text style={styles.count} accessibilityLiveRegion="polite">
            {filteredAlerts.length}{' '}
            {filteredAlerts.length === 1 ? 'alert' : 'alerts'} shown
          </Text>
        </View>

        <View style={styles.filters}>
          <Text style={styles.filterLabel}>Date</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
          >
            {DATE_FILTERS.map((filter) => (
              <FilterPill
                key={filter.key}
                label={filter.label}
                selected={dateFilter === filter.key}
                onPress={() => setDateFilter(filter.key)}
              />
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Priority</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
          >
            {PRIORITY_FILTERS.map((filter) => (
              <FilterPill
                key={filter.key}
                label={filter.label}
                selected={priority === filter.key}
                onPress={() => setPriority(filter.key)}
              />
            ))}
          </ScrollView>
        </View>

        {error && alerts.length > 0 ? (
          <View style={styles.banner}>
            <OfflineBanner lastUpdated={lastUpdated} />
          </View>
        ) : null}

        {error && alerts.length === 0 ? (
          <View style={styles.state}>
            <ScreenState
              icon="cloud-offline-outline"
              title="We couldn’t load alert history."
              message="Check your connection and try again."
              actionLabel="Try again"
              onAction={() => load()}
              tone="error"
            />
          </View>
        ) : (
          <FlatList
            data={filteredAlerts}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <AlertCard
                alert={item}
                showStatus
                onPress={() =>
                  router.push({
                    pathname: '/alert/[id]',
                    params: { id: String(item.id) },
                  })
                }
              />
            )}
            contentContainerStyle={[
              styles.listContent,
              filteredAlerts.length === 0 && styles.emptyListContent,
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => load(true)}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
            ListEmptyComponent={
              <ScreenState
                icon="time-outline"
                title={
                  hasActiveFilters
                    ? 'No alerts match the selected filters.'
                    : 'No previous alerts were found.'
                }
                message={
                  hasActiveFilters
                    ? 'Choose different filters to see more results.'
                    : 'Previous possible alerts will appear here when available.'
                }
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
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
  count: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.caption,
    marginTop: SPACING.xs,
  },
  filters: {
    paddingTop: SPACING.lg,
    gap: SPACING.sm,
  },
  filterLabel: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '700',
    paddingHorizontal: SPACING.lg,
  },
  filterContent: {
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  banner: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  state: {
    padding: SPACING.lg,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxxl,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
