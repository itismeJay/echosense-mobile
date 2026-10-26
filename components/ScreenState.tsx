import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { FONTS, RADIUS, SPACE, TYPE } from '../lib/theme';
import { makeStyles, useTheme } from '../lib/useTheme';
import { Button } from './ui';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'error';
}

/** Empty and error states always say what to do next. */
export default function ScreenState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  tone = 'neutral',
}: Props) {
  const palette = useTheme();
  const styles = useStyles();
  const isError = tone === 'error';

  return (
    <View
      style={[styles.container, isError && styles.errorContainer]}
      accessible={!onAction}
      accessibilityRole={isError ? 'alert' : 'text'}
      accessibilityLiveRegion={isError ? 'assertive' : 'polite'}
    >
      <Ionicons
        name={icon}
        size={28}
        color={isError ? palette.danger : palette.textMuted}
        importantForAccessibility="no-hide-descendants"
      />
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant={isError ? 'primary' : 'secondary'}
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  container: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: RADIUS.panel,
    padding: SPACE.xl,
    gap: SPACE.sm,
  },
  errorContainer: {
    borderColor: palette.danger,
  },
  title: {
    color: palette.text,
    fontFamily: FONTS.semibold,
    ...TYPE.bodyLarge,
    textAlign: 'center',
  },
  message: {
    color: palette.textMuted,
    fontFamily: FONTS.regular,
    ...TYPE.body,
    textAlign: 'center',
  },
  button: {
    marginTop: SPACE.sm,
    minWidth: 140,
  },
}));
