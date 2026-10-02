import { Pressable } from 'react-native';
import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  onPress?: () => void;
  variant?: 'plain' | 'filled' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' };

const variants = {
  plain: 'bg-transparent',
  filled: 'bg-surface-card',
  outline: 'bg-transparent border border-sage-200',
};

export function IconButton({ icon, onPress, variant = 'plain', size = 'md' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className={`${sizes[size]} ${variants[variant]} rounded-full items-center justify-center active:opacity-70`}
    >
      {icon}
    </Pressable>
  );
}
