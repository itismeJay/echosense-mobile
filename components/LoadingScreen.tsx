import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { FONTS, SPACE, TYPE } from '../lib/theme';
import { makeStyles, useTheme } from '../lib/useTheme';

interface Props {
  message?: string;
}

export default function LoadingScreen({
  message = 'Loading…',
}: Props) {
  const palette = useTheme();
  const styles = useStyles();
  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      accessibilityLiveRegion="polite"
    >
      <ActivityIndicator size="large" color={palette.textMuted} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.lg,
    padding: SPACE.xl,
  },
  text: {
    color: palette.textMuted,
    fontFamily: FONTS.regular,
    ...TYPE.body,
    textAlign: 'center',
  },
}));
