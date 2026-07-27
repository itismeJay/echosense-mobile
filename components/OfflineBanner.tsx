import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '../lib/constants';
import { formatLastUpdated } from '../lib/presentation';

export default function OfflineBanner({
  lastUpdated,
}: {
  lastUpdated: Date | null;
}) {
  return (
    <View
      style={styles.banner}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Ionicons
        name="cloud-offline-outline"
        size={22}
        color={COLORS.danger}
        importantForAccessibility="no-hide-descendants"
      />
      <View style={styles.copy}>
        <Text style={styles.title}>You’re offline.</Text>
        <Text style={styles.message}>
          Previously loaded alerts may be out of date. {formatLastUpdated(lastUpdated)}.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    backgroundColor: COLORS.offlineBackground,
  },
  copy: {
    flex: 1,
    gap: SPACING.xs,
  },
  title: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '700',
  },
  message: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 19,
  },
});
