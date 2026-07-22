import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  it("renders the user's name when provided", () => {
    render(<AppHeader userName="Priya Sharma" />);

    expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
  });

  it("calls onLogout when the log out button is clicked", async () => {
    const onLogout = vi.fn();
    render(<AppHeader userName="Priya Sharma" onLogout={onLogout} />);

    await userEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(onLogout).toHaveBeenCalledOnce();
  });

  it("does not render a log out button when onLogout is not provided", () => {
    render(<AppHeader userName="Priya Sharma" />);

    expect(screen.queryByRole("button", { name: "Log out" })).not.toBeInTheDocument();
  });
});
