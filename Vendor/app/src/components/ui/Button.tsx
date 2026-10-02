import { cn } from '@/lib/utils';
import { type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
        {
          'bg-[#E4C654] text-[#1B1B16] hover:bg-[#C9AD3A] focus:ring-[#E4C654]': variant === 'primary',
          'bg-[#1B1B16] text-white hover:bg-[#333328] focus:ring-[#1B1B16]': variant === 'secondary',
          'bg-transparent text-[#1B1B16] hover:bg-[#F0EFE8] focus:ring-[#E4C654]': variant === 'ghost',
          'bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-400': variant === 'danger',
          'border border-[#E8E8E4] bg-white text-[#1B1B16] hover:bg-[#FAFAF8] focus:ring-[#E4C654]': variant === 'outline',
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
