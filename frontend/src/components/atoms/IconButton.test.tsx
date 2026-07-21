import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IconButton } from "./IconButton";

describe("IconButton", () => {
  it("is reachable by its accessible label and calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<IconButton icon={<span aria-hidden="true">×</span>} label="Close" onClick={onClick} />);

    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
