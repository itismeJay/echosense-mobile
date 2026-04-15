import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { COLORS } from '../lib/constants';

interface Props {
  message?: string;
}

export default function LoadingScreen({ message = 'Loading...' }: Props) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.accent} />
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
    gap: 16,
  },
  text: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
});
