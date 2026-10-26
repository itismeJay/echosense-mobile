import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useContext, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { canViewReports } from '../lib/access';
import { fetchStats } from '../lib/api';
import { FONTS, RADIUS, SPACE, TYPE, severityColors } from '../lib/theme';
import type { LogStats, Severity } from '../lib/types';
import { makeStyles, useTheme } from '../lib/useTheme';
import LoadingScreen from '../components/LoadingScreen';
import ScreenState from '../components/ScreenState';
import StatCard from '../components/StatCard';
import { Button, Card, Notice, ScreenHeader, SectionTitle } from '../components/ui';
import { AuthContext } from './_layout';

const SEVERITY_ROWS: { key: Severity; label: string; field: keyof LogStats }[] = [
  { key: 'high', label: 'High', field: 'high_severity' },
  { key: 'medium', label: 'Medium', field: 'medium_severity' },
  { key: 'low', label: 'Low', field: 'low_severity' },
];

export default function ReportsScreen() {
  const { user } = useContext(AuthContext);
  const palette = useTheme();
  const styles = useStyles();
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const allowed = canViewReports(user);

  const load = useCallback(
    async (showRefresh = false) => {
      // Staff never request report data, even if this screen is opened directly.
      if (!allowed) {
        setLoading(false);
        return;
      }
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
    },
    [allowed]
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (loading) {
    return <LoadingScreen message="Loading reports…" />;
  }

  if (!allowed) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.denied}>
          <ScreenState
            icon="lock-closed-outline"
            title="Reports aren’t available for your account."
            message="Your alerts are on the Alerts tab."
            actionLabel="Go to alerts"
            onAction={() => router.replace('/alerts')}
          />
        </View>
      </SafeAreaView>
    );
  }

  const total = stats?.total_alerts ?? 0;
  const max = Math.max(
    1,
    ...SEVERITY_ROWS.map((row) => Number(stats?.[row.field] ?? 0))
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={palette.textMuted}
            colors={[palette.link]}
          />
        }
      >
        <ScreenHeader
          title="Reports"
          subtitle={
            user?.is_super_admin
              ? 'A summary of alerts across every school.'
              : 'A summary of your school’s alerts.'
          }
        />

        {error && !stats ? (
          <ScreenState
            icon="cloud-offline-outline"
            title="We couldn’t load reports."
            message="Check your connection and try again."
            actionLabel="Try again"
            onAction={() => {
              setLoading(true);
              void load();
            }}
            tone="error"
          />
        ) : (
          <>
            {error ? (
              <View style={styles.inlineError}>
                <Notice tone="danger">
                  This summary may be out of date.
                </Notice>
              </View>
            ) : null}

            <View style={styles.statsRow}>
              <StatCard label="All alerts" value={total} />
              <StatCard label="High" value={stats?.high_severity ?? 0} />
            </View>

            <View style={styles.section}>
              <SectionTitle>Alerts by severity</SectionTitle>
              <Card>
                {total > 0 ? (
                  SEVERITY_ROWS.map((row) => {
                    const value = Number(stats?.[row.field] ?? 0);
                    const { color } = severityColors(palette, row.key);
                    return (
                      <View
                        key={row.key}
                        style={styles.barRow}
                        accessible
                        accessibilityLabel={`${row.label}: ${value} ${value === 1 ? 'alert' : 'alerts'}`}
                      >
                        <View style={styles.barHeader}>
                          <Text style={[styles.barLabel, { color }]}>{row.label}</Text>
                          <Text style={styles.barValue}>{value}</Text>
                        </View>
                        <View style={styles.track}>
                          <View
                            style={[
                              styles.bar,
                              {
                                backgroundColor: color,
                                width: `${Math.round((value / max) * 100)}%`,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.empty}>
                    No alerts yet. This report fills in as alerts arrive.
                  </Text>
                )}
              </Card>
            </View>

            {error ? (
              <Button label="Try again" onPress={() => load()} />
            ) : null}
          </>
        )}
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
    maxWidth: 760,
    alignSelf: 'center',
    padding: SPACE.lg,
    paddingBottom: SPACE.xxl,
    gap: SPACE.xl,
  },
  inlineError: {
    marginTop: -SPACE.sm,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.md,
  },
  section: {
    gap: SPACE.sm,
  },
  barRow: {
    gap: SPACE.xs,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barLabel: {
    fontFamily: FONTS.semibold,
    ...TYPE.body,
  },
  barValue: {
    color: palette.text,
    fontFamily: FONTS.semibold,
    ...TYPE.body,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 10,
    borderRadius: RADIUS.tag,
    backgroundColor: palette.surfaceMuted,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: RADIUS.tag,
  },
  empty: {
    color: palette.textMuted,
    fontFamily: FONTS.regular,
    ...TYPE.body,
  },
}));
