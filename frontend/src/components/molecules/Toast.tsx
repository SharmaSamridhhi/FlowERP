import type { ReactNode } from "react";
import { IconButton } from "../atoms/IconButton";

export type ToastVariant = "success" | "error" | "info";

export interface ToastProps {
  variant?: ToastVariant;
  message: ReactNode;
  onDismiss?: () => void;
}

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: "bg-green-50 text-green-800 border-green-200",
  error: "bg-red-50 text-red-800 border-red-200",
  info: "bg-brand-50 text-brand-800 border-brand-200",
};

// Presentational only — no queue/provider. A Phase 3 module that needs
// app-wide toast orchestration wraps this in its own context; this
// component just renders one message.
export function Toast({ variant = "info", message, onDismiss }: ToastProps) {
  return (
    <div
      role="alert"
      className={`flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm shadow-sm ${VARIANT_CLASSES[variant]}`}
    >
      <span>{message}</span>
      {onDismiss && (
        <IconButton icon={<span aria-hidden="true">×</span>} label="Dismiss" onClick={onDismiss} />
      )}
    </div>
  );
}
