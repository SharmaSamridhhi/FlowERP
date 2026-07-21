import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as apiClient from "./api-client";
import { AuthProvider, useAuth } from "./auth-context";

function TestConsumer() {
  const { user, login, logout } = useAuth();
  return (
    <div>
      <p data-testid="user">{user ? `${user.name} (${user.role})` : "no user"}</p>
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

    expect(screen.getByTestId("user")).toHaveTextContent("no user");

    await userEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Admin User (ADMIN)"));

    await userEvent.click(screen.getByRole("button", { name: "Logout" }));

    expect(screen.getByTestId("user")).toHaveTextContent("no user");
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

    await userEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(screen.getByTestId("user")).toHaveTextContent("no user");
  });
});
