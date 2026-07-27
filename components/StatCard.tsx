import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '../lib/constants';

interface Props {
  label: string;
  value: number | string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export default function StatCard({ label, value, color, icon }: Props) {
  return (
    <View
      style={styles.card}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={[styles.icon, { backgroundColor: COLORS.surfaceSecondary }]}>
        <Ionicons
          name={icon}
          size={21}
          color={color}
          importantForAccessibility="no-hide-descendants"
        />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 132,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: TYPOGRAPHY.secondary,
    color: COLORS.textSecondary,
    fontWeight: '600',
    lineHeight: 20,
  },
});
