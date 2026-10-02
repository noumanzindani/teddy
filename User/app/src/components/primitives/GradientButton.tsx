import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@theme/colors';
import type { ReactNode } from 'react';

interface Props {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size?: 'md' | 'lg';
  className?: string;
}

export function GradientButton({
  label, onPress, loading, disabled, leftIcon, rightIcon, size = 'lg', className = '',
}: Props) {
  const isDisabled = disabled || loading;
  const heightClass = size === 'lg' ? 'py-4' : 'py-3';
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`w-full ${isDisabled ? 'opacity-50' : 'active:opacity-90'} ${className}`}
    >
      <LinearGradient
        colors={[...colors.goldGradient]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ borderRadius: 32 }}
      >
        <View className={`flex-row items-center justify-center ${heightClass} px-6`}>
          {loading ? (
            <ActivityIndicator color="#1B1B16" />
          ) : (
            <>
              {leftIcon && <View className="mr-2">{leftIcon}</View>}
              <Text className="text-ink text-base font-semibold">{label}</Text>
              {rightIcon && <View className="ml-2">{rightIcon}</View>}
            </>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}
