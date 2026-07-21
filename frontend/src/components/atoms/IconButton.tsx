import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type IconButtonVariant = "ghost" | "solid";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  /** Required — there's no visible text, so this is the button's only accessible name. */
  label: string;
  variant?: IconButtonVariant;
}

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
  solid: "bg-slate-100 text-slate-700 hover:bg-slate-200",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = "ghost", type = "button", className = "", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {icon}
    </button>
  );
});
