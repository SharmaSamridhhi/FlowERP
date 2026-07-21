import type { AuthUser } from "@flowerp/shared";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext } from "../lib/auth-context";
import type { AuthContextValue } from "../lib/auth-context";
import { ProtectedRoute } from "./ProtectedRoute";

function renderProtected(user: AuthUser | null, initialPath = "/protected") {
  const value: AuthContextValue = { user, login: vi.fn(), logout: vi.fn() };

  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<p>Login page</p>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<p>Protected content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("ProtectedRoute", () => {
  it("redirects to /login when there is no user", () => {
    renderProtected(null);

    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders the protected content when there is a user", () => {
    renderProtected({ id: "1", name: "Admin User", email: "admin@flowerp.test", role: "ADMIN" });

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
