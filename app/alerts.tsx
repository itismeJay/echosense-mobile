import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showsSchoolOnAlerts } from '../lib/access';
import { fetchAlerts } from '../lib/api';
import { MAX_ALERTS_IN_MEMORY, REFRESH_INTERVAL_MS } from '../lib/constants';
import { normalizeSeverity, sortAlertsNewestFirst } from '../lib/presentation';
import type { AlertListTab } from '../lib/review';
import { FONTS, SPACE, TYPE } from '../lib/theme';
import type { Alert, Severity } from '../lib/types';
import { makeStyles, useTheme } from '../lib/useTheme';
import AlertCard from '../components/AlertCard';
import FilterPill from '../components/FilterPill';
import LoadingScreen from '../components/LoadingScreen';
import OfflineBanner from '../components/OfflineBanner';
import ScreenState from '../components/ScreenState';
import { ScreenHeader } from '../components/ui';
import { AuthContext } from './_layout';

type SeverityFilter = 'all' | Severity;

const SEVERITY_FILTERS: { key: SeverityFilter; label: string }[] = [
  { key: 'all', label: 'Any severity' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

const TABS: { key: AlertListTab; label: string }[] = [
  { key: 'needs-review', label: 'Needs review' },
  { key: 'all', label: 'All' },
];

export default function AlertsScreen() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const palette = useTheme();
  const styles = useStyles();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<AlertListTab>(
    params.tab === 'all' ? 'all' : 'needs-review'
  );
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const requestId = useRef(0);
  const showSchool = showsSchoolOnAlerts(user);
  // Nothing loads while signed out or while the password change is pending;
  // the backend would answer 401 or 403 password_change_required.
  const canLoad = isAuthenticated && user?.must_change_password !== true;

  useEffect(() => {
    if (params.tab === 'all' || params.tab === 'needs-review') {
      setTab(params.tab);
    }
  }, [params.tab]);

  // This screen stays mounted across sign-out, so a new account must never
  // see the previous account's list, tab or filter.
  const accountKey = user?.id ?? '';
  useEffect(() => {
    requestId.current += 1;
    setAlerts([]);
    setTab('needs-review');
    setSeverity('all');
    setError(false);
    setLastUpdated(null);
    setLoading(true);
  }, [accountKey]);

  const load = useCallback(
    async (showRefresh = false) => {
      if (!canLoad) return;
      const current = ++requestId.current;
      if (showRefresh) setRefreshing(true);
      try {
        const data = await fetchAlerts(tab);
        // A slower response for the other tab must not replace this one.
        if (current !== requestId.current) return;
        setAlerts(sortAlertsNewestFirst(data).slice(0, MAX_ALERTS_IN_MEMORY));
        setLastUpdated(new Date());
        setError(false);
      } catch {
        if (current === requestId.current) setError(true);
      } finally {
        if (current === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [canLoad, tab]
  );

  useFocusEffect(
    useCallback(() => {
      void load();
      const interval = setInterval(() => void load(), REFRESH_INTERVAL_MS);
      return () => clearInterval(interval);
    }, [load])
  );

  function selectTab(next: AlertListTab) {
    if (next === tab) return;
    setTab(next);
    setAlerts([]);
    setLoading(true);
  }

  const filtered = useMemo(
    () =>
      severity === 'all'
        ? alerts
        : alerts.filter((alert) => normalizeSeverity(alert.severity) === severity),
    [alerts, severity]
  );

  const emptyTitle =
    severity !== 'all'
      ? `No ${severity} alerts here.`
      : tab === 'needs-review'
        ? 'Nothing needs review.'
        : 'No alerts yet.';
  const emptyMessage =
    severity !== 'all'
      ? 'Choose “Any severity” to see the rest.'
      : tab === 'needs-review'
        ? 'New alerts will appear here. Pull down to check again.'
        : 'Alerts from your classrooms will appear here.';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <ScreenHeader
            title="Alerts"
            subtitle={
              showSchool
                ? 'Every school, newest first.'
                : 'Possible classroom concerns, newest first.'
            }
          />
          <View style={styles.tabs} accessibilityRole="tablist">
            {TABS.map((item) => {
              const selected = item.key === tab;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={item.label}
                  onPress={() => selectTab(item.key)}
                  style={[styles.tab, selected && styles.tabSelected]}
                >
                  <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>
                    {item.label}
                    {selected && !loading && tab === 'needs-review'
                      ? ` (${alerts.length})`
                      : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          style={styles.filterBar}
        >
          {SEVERITY_FILTERS.map((filter) => (
            <FilterPill
              key={filter.key}
              label={filter.label}
              selected={severity === filter.key}
              onPress={() => setSeverity(filter.key)}
            />
          ))}
        </ScrollView>

        {error && alerts.length > 0 ? (
          <View style={styles.banner}>
            <OfflineBanner lastUpdated={lastUpdated} />
          </View>
        ) : null}

        {loading ? (
          <LoadingScreen message="Loading classroom alerts…" />
        ) : error && alerts.length === 0 ? (
          <View style={styles.state}>
            <ScreenState
              icon="cloud-offline-outline"
              title="We couldn’t load classroom alerts."
              message="Check your connection and try again. Alerts aren’t lost while the app is offline."
              actionLabel="Try again"
              onAction={() => {
                setLoading(true);
                void load();
              }}
              tone="error"
            />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <AlertCard
                alert={item}
                showSchool={showSchool}
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
              filtered.length === 0 && styles.emptyListContent,
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => load(true)}
                tintColor={palette.textMuted}
                colors={[palette.link]}
              />
            }
            ListEmptyComponent={
              <ScreenState
                icon="checkmark-circle-outline"
                title={emptyTitle}
                message={emptyMessage}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((palette) => ({
  safe: {
    flex: 1,
    backgroundColor: palette.background,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.lg,
    gap: SPACE.lg,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  tab: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: SPACE.md,
    marginBottom: -1,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabSelected: {
    borderBottomColor: palette.text,
  },
  tabLabel: {
    color: palette.textMuted,
    fontFamily: FONTS.medium,
    ...TYPE.body,
  },
  tabLabelSelected: {
    color: palette.text,
    fontFamily: FONTS.semibold,
  },
  filterBar: {
    flexGrow: 0,
  },
  filters: {
    gap: SPACE.sm,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
  },
  banner: {
    paddingHorizontal: SPACE.lg,
    paddingBottom: SPACE.sm,
  },
  state: {
    padding: SPACE.lg,
  },
  listContent: {
    paddingHorizontal: SPACE.lg,
    paddingBottom: SPACE.xxl,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
}));
