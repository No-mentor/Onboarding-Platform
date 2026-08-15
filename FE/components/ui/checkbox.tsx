import * as React from 'react';

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (props, ref) => (
    <input
      type="checkbox"
      ref={ref}
      {...props}
      className="checkbox-base"
    />
  )
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
