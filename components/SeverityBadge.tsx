import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  RADII,
  SEVERITY_BACKGROUNDS,
  SEVERITY_COLORS,
  SEVERITY_ICONS,
} from '../lib/constants';
import { getPriorityLabel, normalizeSeverity } from '../lib/presentation';

interface Props {
  severity: string;
  size?: 'sm' | 'md';
}

export default function SeverityBadge({ severity, size = 'md' }: Props) {
  const normalized = normalizeSeverity(severity);
  const color = SEVERITY_COLORS[normalized];
  const backgroundColor = SEVERITY_BACKGROUNDS[normalized];
  const iconName = SEVERITY_ICONS[normalized] as keyof typeof Ionicons.glyphMap;
  const label = getPriorityLabel(normalized);
  const isSmall = size === 'sm';

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={label.toLowerCase()}
      style={[
        styles.badge,
        { backgroundColor, borderColor: color },
        isSmall && styles.badgeSmall,
      ]}
    >
      <Ionicons
        name={iconName}
        size={isSmall ? 13 : 15}
        color={color}
        importantForAccessibility="no-hide-descendants"
      />
      <Text
        allowFontScaling
        style={[styles.label, { color }, isSmall && styles.labelSmall]}
      >
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
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  badgeSmall: {
    minHeight: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.25,
    flexShrink: 1,
  },
  labelSmall: {
    fontSize: 11,
  },
});
