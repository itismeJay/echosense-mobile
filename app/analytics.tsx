import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { fetchStats } from '../lib/api';
import { COLORS } from '../lib/constants';
import type { LogStats } from '../lib/types';
import LoadingScreen from '../components/LoadingScreen';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 48;

export default function Analytics() {
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchStats();
      setStats(data);
      setError(null);
    } catch {
      setError('Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingScreen message="Loading analytics..." />;

  const chartData = {
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
  };

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: '#0f0f1a',
    backgroundGradientTo: '#0f0f1a',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: () => 'rgba(255,255,255,0.5)',
    propsForBars: { rx: 8, ry: 8 },
    propsForBackgroundLines: { strokeWidth: 0 },
  };

  const total = stats?.total_alerts ?? 0;

  const summaryItems = [
    { label: 'Total', value: total, color: COLORS.accent },
    { label: 'High', value: stats?.high_severity ?? 0, color: COLORS.high },
    { label: 'Medium', value: stats?.medium_severity ?? 0, color: COLORS.medium },
    { label: 'Low', value: stats?.low_severity ?? 0, color: COLORS.low },
  ];

  const distributionItems = [
    {
      label: 'High',
      value: stats?.high_severity ?? 0,
      color: COLORS.high,
    },
    {
      label: 'Medium',
      value: stats?.medium_severity ?? 0,
      color: COLORS.medium,
    },
    {
      label: 'Low',
      value: stats?.low_severity ?? 0,
      color: COLORS.low,
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Analytics</Text>

        {/* Error */}
        {error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={16} color={COLORS.high} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Summary Row */}
        <View style={styles.summaryRow}>
          {summaryItems.map(({ label, value, color }) => (
            <View key={label} style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color }]}>{value}</Text>
              <Text style={styles.summaryLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Bar Chart Card */}
        <View style={styles.chartCard}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <Text style={styles.chartTitle}>Alerts by Severity</Text>
          <BarChart
            data={chartData}
            width={CHART_WIDTH}
            height={200}
            chartConfig={chartConfig}
            style={styles.chart}
            showValuesOnTopOfBars
            withInnerLines={false}
            fromZero
            yAxisLabel=""
            yAxisSuffix=""
          />
        </View>

        {/* Distribution Card */}
        <View style={styles.chartCard}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <Text style={styles.chartTitle}>Severity Distribution</Text>
          <View style={styles.distributionList}>
            {distributionItems.map(({ label, value, color }) => {
              const pct = total > 0 ? value / total : 0;
              return (
                <View key={label} style={styles.progressRow}>
                  <View style={styles.progressHeader}>
                    <Text style={[styles.progressLabel, { color }]}>{label}</Text>
                    <Text style={[styles.progressPct, { color }]}>
                      {Math.round(pct * 100)}%
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.round(pct * 100)}%`,
                          backgroundColor: color,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Empty state when no data */}
        {total === 0 && !error && (
          <View style={styles.emptyNote}>
            <Ionicons name="analytics-outline" size={20} color={COLORS.textDim} />
            <Text style={styles.emptyText}>
              No detection data yet. Charts will populate as alerts come in.
            </Text>
          </View>
        )}

        <View style={{ height: 24 }} />
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
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.4,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  chartCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
    padding: 20,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  chart: {
    borderRadius: 12,
    marginLeft: -20,
  },
  distributionList: {
    gap: 16,
  },
  progressRow: {
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressPct: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    minWidth: 4,
  },
  emptyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    marginBottom: 8,
  },
  emptyText: {
    color: COLORS.textDim,
    fontSize: 13,
    flex: 1,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  errorText: {
    color: COLORS.textMuted,
    fontSize: 13,
    flex: 1,
  },
  retryText: {
    color: COLORS.accent,
    fontWeight: '700',
    fontSize: 13,
  },
});
