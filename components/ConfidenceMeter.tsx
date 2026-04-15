import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { formatConfidence } from '../lib/api';
import { COLORS } from '../lib/constants';

interface Props {
  confidence: number;
  size?: number;
}

export default function ConfidenceMeter({ confidence, size = 80 }: Props) {
  const strokeWidth = 7;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const safe = isNaN(confidence) ? 0 : Math.min(Math.max(confidence, 0), 1);
  const strokeDashoffset = circumference * (1 - safe);

  const color =
    safe >= 0.7 ? COLORS.high : safe >= 0.4 ? COLORS.medium : COLORS.low;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text
        style={{
          color: COLORS.text,
          fontWeight: '700',
          fontSize: Math.round(size * 0.2),
        }}
      >
        {formatConfidence(confidence)}
      </Text>
    </View>
  );
}
