import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { AuthContext, AuthProvider } from "./lib/auth-context";
import type { AuthContextValue } from "./lib/auth-context";

function newQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe("App", () => {
  it("redirects to /login when visiting / while unauthenticated", () => {
    render(
      <QueryClientProvider client={newQueryClient()}>
        <MemoryRouter initialEntries={["/"]}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
  });

  it("renders the dashboard through the real app shell when authenticated", () => {
    const value: AuthContextValue = {
      user: { id: "1", name: "Admin User", email: "admin@flowerp.test", role: "ADMIN" },
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
    };

    render(
      <QueryClientProvider client={newQueryClient()}>
        <MemoryRouter initialEntries={["/"]}>
          <AuthContext.Provider value={value}>
            <App />
          </AuthContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Customer Management" })).toBeInTheDocument();
    expect(screen.getByText("Admin User")).toBeInTheDocument();
  });

  it("renders the not-found page for an unknown path", () => {
    render(
      <QueryClientProvider client={newQueryClient()}>
        <MemoryRouter initialEntries={["/does-not-exist"]}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText("404 — page not found.")).toBeInTheDocument();
  });
});
