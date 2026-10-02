import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-sage-600 active:bg-sage-700',
  secondary: 'bg-gold-300 active:bg-gold-400',
  outline: 'border border-sage-300 bg-transparent active:bg-sage-50',
  ghost: 'bg-transparent active:bg-sage-100',
  danger: 'bg-danger active:opacity-90',
};

const labelClasses: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-ink',
  outline: 'text-ink',
  ghost: 'text-ink',
  danger: 'text-white',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-2 rounded-md',
  md: 'px-4 py-3 rounded-lg',
  lg: 'px-5 py-4 rounded-xl',
};

const labelSize: Record<Size, string> = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' };

export function Button({
  label, onPress, variant = 'primary', size = 'md',
  loading, disabled, leftIcon, rightIcon, fullWidth, className = '',
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`flex-row items-center justify-center ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${isDisabled ? 'opacity-50' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' || variant === 'danger' ? '#fff' : '#1B1B16'} />
      ) : (
        <>
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text className={`font-semibold ${labelClasses[variant]} ${labelSize[size]}`}>{label}</Text>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </>
      )}
    </Pressable>
  );
}
