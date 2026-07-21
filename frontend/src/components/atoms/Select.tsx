import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
  hasError?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, placeholder, hasError = false, className = "", ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={hasError || undefined}
      className={`block w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 ${
        hasError ? "border-red-400 focus:ring-red-500" : "border-slate-300 focus:ring-brand-500"
      } ${className}`}
      {...rest}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
});
