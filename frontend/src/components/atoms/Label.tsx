import type { LabelHTMLAttributes } from "react";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({ children, required = false, className = "", ...rest }: LabelProps) {
  return (
    <label className={`block text-sm font-medium text-slate-700 ${className}`} {...rest}>
      {children}
      {required && (
        <span aria-hidden="true" className="ml-0.5 text-red-600">
          *
        </span>
      )}
    </label>
  );
}
