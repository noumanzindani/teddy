import { cn } from '@/lib/utils';
import { type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'warning';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none',
        {
          'bg-[#E4C654] text-[#1A1A14] hover:bg-[#C9AD3A] focus:ring-[#E4C654]': variant === 'primary',
          'bg-[#1A1A14] text-white hover:bg-[#2E2E26] focus:ring-[#1A1A14]': variant === 'secondary',
          'bg-transparent text-[#1A1A14] hover:bg-[#ECEAE4] focus:ring-[#E4C654]': variant === 'ghost',
          'bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-400 border border-red-200': variant === 'danger',
          'bg-amber-50 text-amber-700 hover:bg-amber-100 focus:ring-amber-400 border border-amber-200': variant === 'warning',
          'border border-[#E4E4E0] bg-white text-[#1A1A14] hover:bg-[#F5F4F0] focus:ring-[#E4C654]': variant === 'outline',
          'px-3 py-1.5 text-xs': size === 'sm',
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
