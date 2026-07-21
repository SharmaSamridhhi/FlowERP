import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Textarea } from "./Textarea";

function ControlledTextarea() {
  const [value, setValue] = useState("");
  return <Textarea aria-label="Notes" value={value} onChange={(e) => setValue(e.target.value)} />;
}

describe("Textarea", () => {
  it("accepts typed input via onChange", async () => {
    render(<ControlledTextarea />);

    const textarea = screen.getByLabelText("Notes");
    await userEvent.type(textarea, "Follow up next week");

    expect(textarea).toHaveValue("Follow up next week");
  });

  it("marks itself invalid when hasError is set", () => {
    render(<Textarea aria-label="Notes" hasError />);

    expect(screen.getByLabelText("Notes")).toHaveAttribute("aria-invalid", "true");
  });
});
