import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { AuthContext, AuthProvider } from "./lib/auth-context";
import type { AuthContextValue } from "./lib/auth-context";

describe("App", () => {
  it("redirects to /login when visiting / while unauthenticated", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Log in to FlowERP" })).toBeInTheDocument();
  });

  it("renders the dashboard through the real app shell when authenticated", () => {
    const value: AuthContextValue = {
      user: { id: "1", name: "Admin User", email: "admin@flowerp.test", role: "ADMIN" },
      login: vi.fn(),
      logout: vi.fn(),
    };

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthContext.Provider value={value}>
          <App />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Customers" })).toBeInTheDocument();
    expect(screen.getByText("Admin User")).toBeInTheDocument();
  });

  it("renders the not-found page for an unknown path", () => {
    render(
      <MemoryRouter initialEntries={["/does-not-exist"]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("404 — page not found.")).toBeInTheDocument();
  });
});
