import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '../lib/constants';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'error';
}

export default function ScreenState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  tone = 'neutral',
}: Props) {
  const isError = tone === 'error';

  return (
    <View
      style={[styles.container, isError && styles.errorContainer]}
      accessible
      accessibilityRole={isError ? 'alert' : 'text'}
      accessibilityLiveRegion={isError ? 'assertive' : 'polite'}
    >
      <View style={[styles.iconCircle, isError && styles.errorIconCircle]}>
        <Ionicons
          name={icon}
          size={28}
          color={isError ? COLORS.danger : COLORS.information}
          importantForAccessibility="no-hide-descendants"
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={styles.button}
          onPress={onAction}
          activeOpacity={0.75}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    padding: SPACING.xxl,
    gap: SPACING.sm,
  },
  errorContainer: {
    backgroundColor: COLORS.offlineBackground,
    borderColor: COLORS.dangerBorder,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.informationBackground,
    marginBottom: SPACING.xs,
  },
  errorIconCircle: {
    backgroundColor: COLORS.dangerBackground,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
  },
  message: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.secondary,
    lineHeight: 21,
    textAlign: 'center',
  },
  button: {
    minHeight: 44,
    minWidth: 112,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '700',
  },
});
