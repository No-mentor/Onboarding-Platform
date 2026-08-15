import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  animated?: boolean;
  size?: 'default' | 'lg';
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, animated = true, size = 'default', ...props }, ref) => {
    const percentage = Math.min(Math.max(value / max, 0), 1) * 100;

    return (
      <div
        ref={ref}
        className={cn(
          'progress-track',
          size === 'lg' && 'h-[10px]',
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'progress-fill transition-all',
            animated && size === 'default' && 'duration-base',
            !animated && 'duration-0'
          )}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export { Progress };
