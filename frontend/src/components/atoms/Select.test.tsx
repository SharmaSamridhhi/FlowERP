import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Select } from "./Select";

const OPTIONS = [
  { value: "retail", label: "Retail" },
  { value: "wholesale", label: "Wholesale" },
];

describe("Select", () => {
  it("renders every option and calls onChange when a new one is picked", async () => {
    const onChange = vi.fn();
    render(<Select aria-label="Customer type" options={OPTIONS} onChange={onChange} />);

    const select = screen.getByLabelText("Customer type");
    expect(screen.getByRole("option", { name: "Wholesale" })).toBeInTheDocument();

    await userEvent.selectOptions(select, "wholesale");

    expect(onChange).toHaveBeenCalledOnce();
    expect(select).toHaveValue("wholesale");
  });

  it("renders a disabled placeholder option when provided", () => {
    render(<Select aria-label="Customer type" options={OPTIONS} placeholder="Select a type..." />);

    expect(screen.getByRole("option", { name: "Select a type..." })).toBeDisabled();
  });
});
