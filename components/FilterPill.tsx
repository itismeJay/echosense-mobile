import React from 'react';
import { Pressable, Text } from 'react-native';
import { FONTS, RADIUS, SPACE, TYPE } from '../lib/theme';
import { makeStyles } from '../lib/useTheme';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export default function FilterPill({ label, selected, onPress }: Props) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} filter`}
      accessibilityState={{ selected }}
      style={[styles.pill, selected && styles.selectedPill]}
      onPress={onPress}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((palette) => ({
  pill: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  selectedPill: {
    borderColor: palette.text,
    backgroundColor: palette.surfaceMuted,
  },
  label: {
    color: palette.textMuted,
    fontFamily: FONTS.medium,
    ...TYPE.small,
  },
  selectedLabel: {
    color: palette.text,
    fontFamily: FONTS.semibold,
  },
}));
