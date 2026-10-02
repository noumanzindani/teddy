import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface Props {
  value: number; // 0-1
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  showLabel?: boolean;
  labelPrimary?: string;
  labelSecondary?: string;
}

export function CircularProgress({
  value, size = 200, strokeWidth = 10,
  color = '#7E8A6E', trackColor = '#DEDBCA',
  showLabel = true, labelPrimary, labelSecondary,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.max(0, Math.min(1, value)));
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {showLabel && (
        <View className="absolute items-center">
          {labelPrimary && <Text className="text-4xl font-bold text-ink">{labelPrimary}</Text>}
          {labelSecondary && <Text className="text-xs tracking-widest text-ink-muted mt-0.5">{labelSecondary}</Text>}
        </View>
      )}
    </View>
  );
}
