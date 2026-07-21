import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppShellTemplate } from "./AppShellTemplate";

const NAV_ITEMS = [{ label: "Dashboard", to: "/" }];

describe("AppShellTemplate", () => {
  it("renders the sidebar nav, header, and content slot", () => {
    render(
      <MemoryRouter>
        <AppShellTemplate role="ADMIN" navItems={NAV_ITEMS} userName="Priya Sharma">
          <p>Dashboard content</p>
        </AppShellTemplate>
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });

  it("toggles the mobile sidebar overlay open and closed", async () => {
    render(
      <MemoryRouter>
        <AppShellTemplate role="ADMIN" navItems={NAV_ITEMS}>
          <p>Content</p>
        </AppShellTemplate>
      </MemoryRouter>,
    );

    expect(screen.queryByRole("link", { name: "Dashboard" })?.parentElement).not.toHaveClass(
      "translate-x-0",
    );

    await userEvent.click(screen.getByRole("button", { name: "Toggle navigation" }));

    const sidebarPanel = screen
      .getByRole("link", { name: "Dashboard" })
      .closest("aside")?.parentElement;
    expect(sidebarPanel).toHaveClass("translate-x-0");
  });

  it("closes the mobile sidebar when a nav item is clicked", async () => {
    render(
      <MemoryRouter>
        <AppShellTemplate role="ADMIN" navItems={NAV_ITEMS}>
          <p>Content</p>
        </AppShellTemplate>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Toggle navigation" }));
    await userEvent.click(screen.getByRole("link", { name: "Dashboard" }));

    const sidebarPanel = screen
      .getByRole("link", { name: "Dashboard" })
      .closest("aside")?.parentElement;
    expect(sidebarPanel).toHaveClass("-translate-x-full");
  });

  it("calls onLogout when provided and the log out button is clicked", async () => {
    const onLogout = vi.fn();
    render(
      <MemoryRouter>
        <AppShellTemplate role="ADMIN" navItems={NAV_ITEMS} userName="Priya" onLogout={onLogout}>
          <p>Content</p>
        </AppShellTemplate>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(onLogout).toHaveBeenCalledOnce();
  });
});
