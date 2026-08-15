import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string | boolean;
  hint?: string;
}

const InputBase = React.forwardRef<HTMLInputElement, Omit<InputProps, 'error' | 'hint'>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn('input-base', className)}
      ref={ref}
      {...props}
    />
  )
);
InputBase.displayName = 'InputBase';

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, hint, ...props }, ref) => {
    const hasError = error && typeof error === 'string';

    return (
      <div className="w-full">
        <InputBase
          type={type}
          className={cn(
            hasError && 'border-destructive focus:ring-[rgba(180,52,47,0.1)]',
            className
          )}
          ref={ref}
          {...props}
        />
        {hasError && (
          <p className="mt-[7px] text-[12px] text-destructive">{error}</p>
        )}
        {hint && !hasError && (
          <p className="mt-[7px] text-[12px] text-muted leading-[1.5]">{hint}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input, InputBase };
