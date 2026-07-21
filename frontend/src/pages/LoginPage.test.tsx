import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as apiClient from "../lib/api-client";
import { AuthProvider } from "../lib/auth-context";
import LoginPage from "./LoginPage";

function renderLoginPage(initialEntry: string | { pathname: string; state?: unknown } = "/login") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>Home page</p>} />
          <Route path="/customers" element={<p>Customers page</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const SUCCESSFUL_LOGIN_RESPONSE = {
  data: {
    token: "fake-token",
    user: { id: "1", name: "Admin User", email: "admin@flowerp.test", role: "ADMIN" as const },
  },
};

describe("LoginPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs in and navigates to / on success", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue(SUCCESSFUL_LOGIN_RESPONSE);

    renderLoginPage();

    await userEvent.type(screen.getByLabelText("Email"), "admin@flowerp.test");
    await userEvent.type(screen.getByLabelText("Password"), "password");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(screen.getByText("Home page")).toBeInTheDocument());
  });

  it("shows an inline error and stays on the page when login fails", async () => {
    vi.spyOn(apiClient, "apiRequest").mockRejectedValue(
      new apiClient.ApiError(401, "UNAUTHORIZED", "Invalid email or password"),
    );

    renderLoginPage();

    await userEvent.type(screen.getByLabelText("Email"), "admin@flowerp.test");
    await userEvent.type(screen.getByLabelText("Password"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("redirects back to the originally-requested route after login", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue(SUCCESSFUL_LOGIN_RESPONSE);

    renderLoginPage({ pathname: "/login", state: { from: { pathname: "/customers" } } });

    await userEvent.type(screen.getByLabelText("Email"), "admin@flowerp.test");
    await userEvent.type(screen.getByLabelText("Password"), "password");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(screen.getByText("Customers page")).toBeInTheDocument());
  });
});
