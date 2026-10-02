import { cn } from '@/lib/utils';
import { type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-[#1B1B16]">{label}</label>}
      <input
        id={inputId}
        className={cn(
          'w-full px-3 py-2.5 rounded-lg border bg-white text-[#1B1B16] placeholder-[#A8A89F] text-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-[#E4C654] focus:border-transparent',
          error ? 'border-red-400' : 'border-[#E8E8E4] hover:border-[#A8A89F]',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-[#6B6B62]">{hint}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className, id, ...props }: SelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-[#1B1B16]">{label}</label>}
      <select
        id={inputId}
        className={cn(
          'w-full px-3 py-2.5 rounded-lg border bg-white text-[#1B1B16] text-sm transition-colors appearance-none',
          'focus:outline-none focus:ring-2 focus:ring-[#E4C654] focus:border-transparent',
          error ? 'border-red-400' : 'border-[#E8E8E4] hover:border-[#A8A89F]',
          className
        )}
        {...props}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
