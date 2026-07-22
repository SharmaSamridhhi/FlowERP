import type { AuthUser } from "@flowerp/shared";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext } from "../lib/auth-context";
import type { AuthContextValue } from "../lib/auth-context";
import { RequireRole } from "./RequireRole";

function renderGated(user: AuthUser | null) {
  const value: AuthContextValue = { user, isInitializing: false, login: vi.fn(), logout: vi.fn() };

  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={["/gated"]}>
        <Routes>
          <Route element={<RequireRole roles={["ADMIN", "SALES"]} />}>
            <Route path="/gated" element={<p>Gated content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("RequireRole", () => {
  it("renders the gated content when the user's role is in the allowed list", () => {
    renderGated({ id: "1", name: "Admin User", email: "admin@flowerp.test", role: "ADMIN" });

    expect(screen.getByText("Gated content")).toBeInTheDocument();
  });

  it("renders a Forbidden state naming the allowed roles when the user's role is not allowed", () => {
    renderGated({
      id: "2",
      name: "Warehouse User",
      email: "warehouse@flowerp.test",
      role: "WAREHOUSE",
    });

    expect(screen.queryByText("Gated content")).not.toBeInTheDocument();
    expect(screen.getByText("You don't have access to this page")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Only Admin and Sales can do this.");
  });

  it("renders a Forbidden state when there is no user", () => {
    renderGated(null);

    expect(screen.queryByText("Gated content")).not.toBeInTheDocument();
    expect(screen.getByText("You don't have access to this page")).toBeInTheDocument();
  });
});
