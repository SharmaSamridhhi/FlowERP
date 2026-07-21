import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Input } from "./Input";

function ControlledInput() {
  const [value, setValue] = useState("");
  return <Input aria-label="Name" value={value} onChange={(e) => setValue(e.target.value)} />;
}

describe("Input", () => {
  it("accepts typed input via onChange", async () => {
    render(<ControlledInput />);

    const input = screen.getByLabelText("Name");
    await userEvent.type(input, "Ada");

    expect(input).toHaveValue("Ada");
  });

  it("marks itself invalid when hasError is set", () => {
    render(<Input aria-label="Email" hasError />);

    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });
});
