import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { formatConfidence, formatTimestamp } from '../lib/api';
import { COLORS } from '../lib/constants';
import type { Alert } from '../lib/types';
import SeverityBadge from './SeverityBadge';

interface Props {
  alert: Alert;
  onPress?: () => void;
}

export default function AlertCard({ alert, onPress }: Props) {
  return (
    <TouchableOpacity
      style={styles.wrapper}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.inner}>
        <View style={styles.topRow}>
          <SeverityBadge severity={alert.severity} />
          <Text style={styles.confidence}>{formatConfidence(alert.confidence)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.metaText}>{alert.location || 'Unknown location'}</Text>
        </View>
        <View style={styles.bottomRow}>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={12} color={COLORS.textDim} />
            <Text style={styles.timestamp}>{formatTimestamp(alert.created_at)}</Text>
          </View>
          {alert.duration > 0 && (
            <Text style={styles.duration}>{alert.duration}s</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
    marginVertical: 5,
  },
  inner: {
    padding: 16,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timestamp: {
    fontSize: 11,
    color: COLORS.textDim,
  },
  confidence: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  duration: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});
