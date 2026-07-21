import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { envResult } from "./config/env";
import "./index.css";
import { AuthProvider } from "./lib/auth-context";
import { queryClient } from "./lib/query-client";
import { ToastProvider } from "./lib/toast-context";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);

// Fail loudly on bad config: a Vite app can't refuse to boot the way a
// Node process can, so a visible error screen — instead of mounting the
// real app against invalid environment values — is the equivalent here.
// See specs/FLO-018-env-config-secrets.md.
if (!envResult.success) {
  root.render(
    <div style={{ fontFamily: "monospace", padding: "2rem", color: "#b91c1c" }}>
      <h1>Configuration error</h1>
      <p>{envResult.message}</p>
    </div>,
  );
} else {
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
}
