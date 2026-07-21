import { cloneElement, isValidElement } from "react";
import type { ReactElement } from "react";
import { Label } from "../atoms/Label";

interface FieldElementProps {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  hasError?: boolean;
}

export interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactElement<FieldElementProps>;
}

// Composes Label + an arbitrary form control (Input/Select/Textarea) +
// error message, wiring id/aria-describedby/aria-invalid/hasError onto the
// child automatically so a Zod-validated form only has to pass `error`.
export function FormField({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  children,
}: FormFieldProps) {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  const field = isValidElement(children)
    ? cloneElement(children, {
        id: htmlFor,
        "aria-describedby": describedBy,
        "aria-invalid": Boolean(error),
        hasError: Boolean(error),
      })
    : children;

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {field}
      {hint && !error && (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
