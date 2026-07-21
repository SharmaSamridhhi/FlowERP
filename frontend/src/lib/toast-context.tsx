/* eslint-disable react-refresh/only-export-components -- context value +
   provider + hook are cohesive and small; splitting into three files
   purely for Fast Refresh's benefit isn't worth the fragmentation. */
import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { Toast } from "../components/molecules";
import type { ToastVariant } from "../components/molecules";

interface ToastMessage {
  id: number;
  variant: ToastVariant;
  message: string;
}

export interface ToastContextValue {
  showToast: (variant: ToastVariant, message: string) => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const AUTO_DISMISS_MS = 5000;

// Global (survives navigation) rather than page-local — a form page that
// triggers a toast and immediately redirects needs the toast to still be
// showing on the destination page. See specs/FLO-012-customer-crm.md.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = Date.now();
      setToasts((current) => [...current, { id, variant, message }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            variant={toast.variant}
            message={toast.message}
            onDismiss={() => dismiss(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
