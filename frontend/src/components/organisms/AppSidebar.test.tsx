import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppSidebar } from "./AppSidebar";
import type { NavItem } from "./AppSidebar";

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/" },
  { label: "Customers", to: "/customers", roles: ["SALES", "ADMIN"] },
  { label: "Stock movements", to: "/stock", roles: ["WAREHOUSE", "ADMIN"] },
];

describe("AppSidebar", () => {
  it("renders items with no role restriction regardless of role", () => {
    render(
      <MemoryRouter>
        <AppSidebar role="ACCOUNTS" navItems={NAV_ITEMS} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("hides items whose roles don't include the current role", () => {
    render(
      <MemoryRouter>
        <AppSidebar role="SALES" navItems={NAV_ITEMS} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Customers" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Stock movements" })).not.toBeInTheDocument();
  });

  it("shows every role-restricted item for a role with access to all of them", () => {
    render(
      <MemoryRouter>
        <AppSidebar role="ADMIN" navItems={NAV_ITEMS} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Customers" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Stock movements" })).toBeInTheDocument();
  });
});
