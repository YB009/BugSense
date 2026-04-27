import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';
import { Children, cloneElement, isValidElement } from 'react';
import { cn } from '../../../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  icon?: ReactNode;
  iconTrailing?: ReactNode;
  loading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-panel hover:bg-white/92 dark:hover:bg-white/90',
  secondary:
    'bg-secondary text-secondary-foreground border border-border hover:border-border-strong hover:bg-secondary/85',
  ghost:
    'bg-transparent text-foreground border border-transparent hover:border-border hover:bg-panel-strong/60',
  destructive:
    'bg-error/14 text-error border border-error/30 hover:bg-error/18 hover:border-error/50',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-[0.95rem]',
};

export function buttonStyles({
  className,
  size = 'md',
  variant = 'primary',
}: {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return cn(
    'group inline-flex min-w-0 shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium tracking-[0.01em]',
    'transition-[background-color,border-color,color,transform,opacity,box-shadow] duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'active:scale-[0.985] disabled:pointer-events-none disabled:opacity-55',
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

export function Button({
  asChild,
  children,
  className,
  disabled,
  icon,
  iconTrailing,
  loading,
  size = 'md',
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  const composedClassName = buttonStyles({ className, size, variant });

  if (asChild) {
    const child = Children.only(children) as ReactElement<{ className?: string; children?: ReactNode }>;

    if (!isValidElement(child)) {
      return null;
    }

    const childContent = (
      <>
        {loading ? (
          <span className="inline-flex size-3 rounded-full border-2 border-current border-r-transparent animate-spin" />
        ) : (
          icon
        )}
        <span className="leading-none text-center">{child.props.children}</span>
        {iconTrailing}
      </>
    );

    return cloneElement(child, {
      className: cn(composedClassName, child.props.className),
      children: childContent,
    });
  }

  const composedChildren = (
    <>
      {loading ? (
        <span className="inline-flex size-3 rounded-full border-2 border-current border-r-transparent animate-spin" />
      ) : (
        icon
      )}
      <span className="leading-none text-center">{children}</span>
      {iconTrailing}
    </>
  );

  return (
    <button
      className={composedClassName}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {composedChildren}
    </button>
  );
}
