import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { formatLastUpdated } from '../lib/presentation';
import { FONTS, RADIUS, SPACE, TYPE } from '../lib/theme';
import { makeStyles, useTheme } from '../lib/useTheme';

export default function OfflineBanner({
  lastUpdated,
}: {
  lastUpdated: Date | null;
}) {
  const palette = useTheme();
  const styles = useStyles();
  return (
    <View
      style={styles.banner}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Ionicons
        name="cloud-offline-outline"
        size={20}
        color={palette.danger}
        importantForAccessibility="no-hide-descendants"
      />
      <View style={styles.copy}>
        <Text style={styles.title}>Can’t reach EchoSense right now.</Text>
        <Text style={styles.message}>
          These alerts may be out of date. {formatLastUpdated(lastUpdated)}. Pull
          down to try again.
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.md,
    padding: SPACE.md,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: palette.danger,
    backgroundColor: palette.dangerBackground,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: palette.danger,
    fontFamily: FONTS.semibold,
    ...TYPE.body,
  },
  message: {
    color: palette.text,
    fontFamily: FONTS.regular,
    ...TYPE.small,
  },
}));
