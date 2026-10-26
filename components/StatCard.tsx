import React from 'react';
import { Text, View } from 'react-native';
import { FONTS, RADIUS, SPACE, TYPE } from '../lib/theme';
import { makeStyles } from '../lib/useTheme';

interface Props {
  label: string;
  value: number | string;
}

export default function StatCard({ label, value }: Props) {
  const styles = useStyles();
  return (
    <View
      style={styles.card}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  card: {
    flex: 1,
    minWidth: 132,
    backgroundColor: palette.surface,
    borderRadius: RADIUS.panel,
    borderWidth: 1,
    borderColor: palette.line,
    padding: SPACE.lg,
    gap: SPACE.xs,
  },
  label: {
    color: palette.textMuted,
    fontFamily: FONTS.medium,
    ...TYPE.small,
  },
  value: {
    color: palette.text,
    fontFamily: FONTS.semibold,
    fontSize: 30,
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
  },
}));
