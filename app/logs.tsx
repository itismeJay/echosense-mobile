import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchLogs, normalizeSeverity } from '../lib/api';
import { COLORS, SEVERITY_COLORS } from '../lib/constants';
import type { Alert } from '../lib/types';
import AlertCard from '../components/AlertCard';
import LoadingScreen from '../components/LoadingScreen';

type Filter = 'all' | 'high' | 'medium' | 'low';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

export default function Logs() {
  const [logs, setLogs] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const data = await fetchLogs();
      setLogs(data);
      setError(null);
    } catch {
      setError('Failed to load logs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    filter === 'all'
      ? logs
      : logs.filter((a) => normalizeSeverity(a.severity) === filter);

  if (loading) return <LoadingScreen message="Loading logs..." />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Detection Logs</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{filtered.length}</Text>
          </View>
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {FILTERS.map(({ key, label }) => {
            const active = filter === key;
            const pillColor =
              key === 'all' ? COLORS.accent : SEVERITY_COLORS[key];
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.pill,
                  active && {
                    backgroundColor: `${pillColor}22`,
                    borderColor: `${pillColor}88`,
                  },
                ]}
                onPress={() => setFilter(key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pillText,
                    active && { color: pillColor, fontWeight: '700' },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Error */}
        {error && (
          <View style={styles.errorRow}>
            <Ionicons
              name="alert-circle-outline"
              size={16}
              color={COLORS.high}
            />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => load()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <AlertCard alert={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={COLORS.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="document-outline"
                size={40}
                color={COLORS.textDim}
              />
              <Text style={styles.emptyText}>
                No {filter !== 'all' ? filter : ''} alerts found
              </Text>
            </View>
          }
        />
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  countBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  filterScroll: {
    flexGrow: 0,
    paddingVertical: 4,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
  },
  pillText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 64,
    gap: 12,
  },
  emptyText: {
    color: COLORS.textDim,
    fontSize: 14,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
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
