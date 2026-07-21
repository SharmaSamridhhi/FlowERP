import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Toast } from "./Toast";

describe("Toast", () => {
  it("renders its message", () => {
    render(<Toast variant="success" message="Customer saved" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Customer saved");
  });

  it("calls onDismiss when the dismiss button is clicked", async () => {
    const onDismiss = vi.fn();
    render(<Toast variant="error" message="Something went wrong" onDismiss={onDismiss} />);

    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("does not render a dismiss button when onDismiss is not provided", () => {
    render(<Toast message="Informational" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
