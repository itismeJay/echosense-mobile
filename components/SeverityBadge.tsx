import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { normalizeSeverity } from '../lib/api';
import { SEVERITY_COLORS, SEVERITY_ICONS } from '../lib/constants';

interface Props {
  severity: string;
  size?: 'sm' | 'md';
}

export default function SeverityBadge({ severity, size = 'md' }: Props) {
  const normalized = normalizeSeverity(severity);
  const color = SEVERITY_COLORS[normalized];
  const iconName = SEVERITY_ICONS[normalized] as keyof typeof Ionicons.glyphMap;
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: `${color}22`,
          borderColor: `${color}55`,
        },
        isSmall && styles.badgeSm,
      ]}
    >
      <Ionicons name={iconName} size={isSmall ? 10 : 12} color={color} />
      <Text style={[styles.label, { color }, isSmall && styles.labelSm]}>
        {normalized.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  labelSm: {
    fontSize: 9,
  },
});
