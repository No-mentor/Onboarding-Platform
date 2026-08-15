import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SeparatorProps
  extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  dashed?: boolean;
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  (
    {
      className,
      orientation = 'horizontal',
      dashed = false,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      className={cn(
        orientation === 'horizontal'
          ? 'h-px w-full'
          : 'h-full w-px',
        dashed && 'border-dashed',
        !dashed && orientation === 'horizontal' && 'bg-border',
        !dashed && orientation === 'vertical' && 'bg-border',
        dashed && 'border-l-0 border-r-0 border-b-0' && 'border-t border-border',
        className
      )}
      {...props}
    />
  )
);
Separator.displayName = 'Separator';

export { Separator };
