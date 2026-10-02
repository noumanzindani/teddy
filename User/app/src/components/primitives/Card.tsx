import { View, ViewProps } from 'react-native';

interface Props extends ViewProps {
  variant?: 'flat' | 'raised';
  padded?: boolean;
}

export function Card({ children, variant = 'flat', padded = true, className = '', ...rest }: Props & { className?: string }) {
  const base = variant === 'raised' ? 'bg-surface-card' : 'bg-surface-raised';
  return (
    <View className={`${base} rounded-xl ${padded ? 'p-4' : ''} ${className}`} {...rest}>
      {children}
    </View>
  );
}
