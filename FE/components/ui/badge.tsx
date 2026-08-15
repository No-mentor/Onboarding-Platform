import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center h-6 px-[9px] ' +
  'rounded-[7px] text-badge font-semibold leading-none uppercase ' +
  'tracking-[0.04em]',
  {
    variants: {
      status: {
        ready: 'bg-surface-sunk text-body',
        processing: 'bg-surface-sunk text-body',
        pending: 'bg-transparent border border-border text-muted',
        failed: 'bg-[rgba(180,52,47,0.07)] text-destructive',
      },
    },
    defaultVariants: {
      status: 'ready',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, status, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ status }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
