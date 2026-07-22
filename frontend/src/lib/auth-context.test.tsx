import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as apiClient from "./api-client";
import { AuthProvider, useAuth } from "./auth-context";

const TOKEN_STORAGE_KEY = "flowerp_token";

function TestConsumer() {
  const { user, isInitializing, login, logout } = useAuth();
  return (
    <div>
      <p data-testid="user">
        {isInitializing ? "initializing" : user ? `${user.name} (${user.role})` : "no user"}
      </p>
      <button
        onClick={() => {
          login("admin@flowerp.test", "password").catch(() => undefined);
        }}
      >
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe("AuthProvider / useAuth", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("throws when useAuth is used outside an AuthProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<TestConsumer />)).toThrow("useAuth must be used within an AuthProvider");

    consoleSpy.mockRestore();
  });

  it("starts with no user, sets the user after a successful login, and clears it on logout", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: {
        token: "fake-token",
        user: { id: "1", name: "Admin User", email: "admin@flowerp.test", role: "ADMIN" },
      },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("no user"));

    await userEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Admin User (ADMIN)"));
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBe("fake-token");

    await userEvent.click(screen.getByRole("button", { name: "Logout" }));

    expect(screen.getByTestId("user")).toHaveTextContent("no user");
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it("does not set a user when login fails", async () => {
    vi.spyOn(apiClient, "apiRequest").mockRejectedValue(
      new apiClient.ApiError(401, "UNAUTHORIZED", "Invalid email or password"),
    );

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("no user"));

    await userEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(screen.getByTestId("user")).toHaveTextContent("no user");
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it("restores the session from a token already in sessionStorage on mount", async () => {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, "existing-token");
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: { id: "2", name: "Sales User", email: "sales@flowerp.test", role: "SALES" },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId("user")).toHaveTextContent("initializing");

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Sales User (SALES)"));
    expect(apiClient.apiRequest).toHaveBeenCalledWith("/auth/me");
  });

  it("clears an invalid/expired token found in sessionStorage on mount", async () => {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, "stale-token");
    vi.spyOn(apiClient, "apiRequest").mockRejectedValue(
      new apiClient.ApiError(401, "UNAUTHORIZED", "Invalid token"),
    );

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("no user"));
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
});
