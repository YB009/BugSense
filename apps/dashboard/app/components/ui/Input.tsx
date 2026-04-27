import type { InputHTMLAttributes } from 'react';
import { cn } from '../../../lib/utils';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-12 w-full rounded-xl border border-input bg-panel/80 px-4 py-3 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]',
        'placeholder:text-muted-foreground/80',
        'transition-[border-color,box-shadow,background-color] duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'focus-visible:border-border-strong focus-visible:bg-panel-strong/90',
        className,
      )}
      {...props}
    />
  );
}
