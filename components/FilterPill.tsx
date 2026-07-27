import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '../lib/constants';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export default function FilterPill({ label, selected, onPress }: Props) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${label} filter`}
      accessibilityState={{ selected }}
      style={[styles.pill, selected && styles.selectedPill]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  selectedPill: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.informationBackground,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '600',
  },
  selectedLabel: {
    color: COLORS.primaryPressed,
    fontWeight: '700',
  },
});
