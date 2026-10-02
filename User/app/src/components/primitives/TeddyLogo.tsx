import { View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Props {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { wordmark: 28, tagline: 9, archWidth: 140, archHeight: 22 },
  md: { wordmark: 44, tagline: 11, archWidth: 220, archHeight: 30 },
  lg: { wordmark: 56, tagline: 13, archWidth: 270, archHeight: 36 },
};

export function TeddyLogo({ variant = 'light', size = 'md' }: Props) {
  const s = sizes[size];
  const wordColor = variant === 'light' ? '#FFFFFF' : '#1B1B16';
  const archColor = variant === 'light' ? '#E0C58A' : '#B89766';
  const taglineColor = variant === 'light' ? '#FFFFFF' : '#3A3A33';

  return (
    <View className="items-center">
      <View className="relative items-center justify-center">
        <Text
          style={{
            fontSize: s.wordmark,
            color: wordColor,
            fontWeight: '300',
            letterSpacing: 4,
            // serif feel — system serif as placeholder
            fontFamily: 'serif',
          }}
        >
          TEDDY
        </Text>
        <Svg
          width={s.archWidth}
          height={s.archHeight}
          viewBox="0 0 200 30"
          style={{ position: 'absolute', bottom: -s.archHeight * 0.15 }}
        >
          <Path
            d="M5 5 Q100 35 195 5"
            stroke={archColor}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      </View>
      <Text
        style={{
          fontSize: s.tagline,
          color: taglineColor,
          letterSpacing: 4,
          marginTop: s.wordmark * 0.25,
        }}
      >
        WELLNESS SCHEDULING
      </Text>
    </View>
  );
}
