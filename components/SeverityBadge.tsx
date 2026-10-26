import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getPriorityLabel, normalizeSeverity } from '../lib/presentation';
import { FONTS, RADIUS, severityColors } from '../lib/theme';
import { useTheme } from '../lib/useTheme';

interface Props {
  severity: string;
  size?: 'sm' | 'md';
}

/** Severity is always shown as a word; the color only reinforces it. */
export default function SeverityBadge({ severity, size = 'md' }: Props) {
  const palette = useTheme();
  const normalized = normalizeSeverity(severity);
  const { color, background } = severityColors(palette, normalized);
  const label = getPriorityLabel(normalized);
  const isSmall = size === 'sm';

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={
        normalized === 'unknown' ? label : `${label} severity`
      }
      style={[styles.badge, { backgroundColor: background }, isSmall && styles.badgeSmall]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }, isSmall && styles.labelSmall]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    minHeight: 28,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.tag,
  },
  badgeSmall: {
    minHeight: 24,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    lineHeight: 18,
  },
  labelSmall: {
    fontSize: 12,
    lineHeight: 16,
  },
});
