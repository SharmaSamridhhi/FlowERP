import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "../atoms/Input";
import { FormField } from "./FormField";

describe("FormField", () => {
  it("renders the label and associates it with the field", () => {
    render(
      <FormField label="Customer name" htmlFor="name">
        <Input />
      </FormField>,
    );

    expect(screen.getByLabelText("Customer name")).toBeInTheDocument();
  });

  it("shows the error message and marks the field invalid", () => {
    render(
      <FormField label="Mobile" htmlFor="mobile" error="Mobile number is required">
        <Input />
      </FormField>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Mobile number is required");
    expect(screen.getByLabelText("Mobile")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows a hint instead of an error when there is no error", () => {
    render(
      <FormField label="GST number" htmlFor="gst" hint="Optional, format: 22AAAAA0000A1Z5">
        <Input />
      </FormField>,
    );

    expect(screen.getByText("Optional, format: 22AAAAA0000A1Z5")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
