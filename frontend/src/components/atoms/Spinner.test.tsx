import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("renders with an accessible status role and label", () => {
    render(<Spinner label="Loading customers" />);

    expect(screen.getByRole("status", { name: "Loading customers" })).toBeInTheDocument();
  });
});
