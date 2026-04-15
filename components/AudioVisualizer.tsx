import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../lib/constants';

const BAR_COUNT = 16;
const MIN_HEIGHT = 4;
const MAX_HEIGHT = 48;

interface BarProps {
  index: number;
  active: boolean;
}

function AnimatedBar({ index, active }: BarProps) {
  const height = useSharedValue(MIN_HEIGHT);

  // Pre-compute random values outside worklets (safe — called during mount only)
  const targetHeight = MIN_HEIGHT + Math.random() * (MAX_HEIGHT - MIN_HEIGHT);
  const lowHeight = MIN_HEIGHT + Math.random() * 12;
  const duration = 280 + index * 20 + Math.random() * 200;
  const idleHeight = MIN_HEIGHT + (index % 4) * 3;

  useEffect(() => {
    if (active) {
      height.value = withRepeat(
        withSequence(
          withTiming(targetHeight, {
            duration,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(lowHeight, {
            duration: duration * 0.6,
            easing: Easing.inOut(Easing.sin),
          })
        ),
        -1,
        true
      );
    } else {
      height.value = withTiming(idleHeight, { duration: 400 });
    }
  }, [active]);

  const animStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  const barColor = index % 2 === 0 ? COLORS.accent : COLORS.accentEnd;

  return (
    <Animated.View
      style={[styles.bar, { backgroundColor: barColor }, animStyle]}
    />
  );
}

interface Props {
  active?: boolean;
}

export default function AudioVisualizer({ active = true }: Props) {
  return (
    <View style={styles.container}>
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <AnimatedBar key={i} index={i} active={active} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    height: MAX_HEIGHT + 8,
    paddingHorizontal: 8,
  },
  bar: {
    width: 6,
    borderRadius: 3,
    minHeight: MIN_HEIGHT,
  },
});
