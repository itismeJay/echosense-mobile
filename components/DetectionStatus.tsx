import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../lib/constants';

interface Props {
  detected: boolean;
}

export default function DetectionStatus({ detected }: Props) {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.4);

  useEffect(() => {
    if (detected) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 700 }),
          withTiming(1, { duration: 700 })
        ),
        -1,
        false
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 700 }),
          withTiming(0.5, { duration: 700 })
        ),
        -1,
        false
      );
    } else {
      // Gentle idle pulse for monitoring
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1400 }),
          withTiming(1, { duration: 1400 })
        ),
        -1,
        false
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.1, { duration: 1400 }),
          withTiming(0.35, { duration: 1400 })
        ),
        -1,
        false
      );
    }
  }, [detected]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const color = detected ? COLORS.high : COLORS.low;
  const label = detected ? 'Aggression Detected' : 'Monitoring Active';
  const subtitle = detected
    ? 'Acoustic aggression event detected'
    : 'Listening for acoustic events';
  const iconName: keyof typeof Ionicons.glyphMap = detected
    ? 'warning'
    : 'radio-outline';

  return (
    <View style={styles.wrapper}>
      <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[styles.accentBar, { backgroundColor: color }]} />
      <View style={styles.content}>
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <Animated.View
              style={[styles.pulse, { backgroundColor: color }, pulseStyle]}
            />
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: `${color}22`,
                  borderColor: `${color}66`,
                },
              ]}
            >
              <Ionicons name={iconName} size={28} color={color} />
            </View>
          </View>
          <View style={styles.textBlock}>
            <Text style={[styles.statusLabel, { color }]}>{label}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
    marginVertical: 8,
  },
  accentBar: {
    height: 3,
    width: '100%',
  },
  content: {
    padding: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  statusLabel: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
