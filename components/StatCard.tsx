import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../lib/constants';

interface Props {
  label: string;
  value: number | string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export default function StatCard({ label, value, color, icon }: Props) {
  return (
    <View style={styles.wrapper}>
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[styles.colorBar, { backgroundColor: color }]} />
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: `${color}22` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
    margin: 4,
    minWidth: '45%',
  },
  colorBar: {
    height: 3,
    width: '100%',
  },
  content: {
    padding: 16,
    gap: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  label: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});
