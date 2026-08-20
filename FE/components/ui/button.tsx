import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold ' +
  'rounded-md cursor-pointer transition-colors duration-fast ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-white hover:bg-primary-hover active:translate-y-[1px]',
        secondary:
          'bg-surface border border-border-strong text-text hover:bg-surface-hover',
        outline:
          'bg-surface border border-border-strong text-text hover:bg-surface-hover',
        ghost: 'bg-transparent text-text hover:bg-surface-sunk',
        danger:
          'bg-destructive text-white hover:bg-[#a23b29] active:translate-y-[1px]',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-11 px-6 text-base',
        xl: 'h-[46px] px-6 text-[14.5px]',
        chip: 'h-[30px] px-3 text-label',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
);
Button.displayName = 'Button';

export { Button, buttonVariants };
