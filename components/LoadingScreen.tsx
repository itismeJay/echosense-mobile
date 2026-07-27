import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../lib/constants';

interface Props {
  message?: string;
}

export default function LoadingScreen({
  message = 'Loading available information…',
}: Props) {
  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      accessibilityLiveRegion="polite"
    >
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    padding: SPACING.xxl,
  },
  text: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '500',
    lineHeight: 21,
    textAlign: 'center',
  },
});
