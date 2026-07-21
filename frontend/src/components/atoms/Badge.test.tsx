import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders its children", () => {
    render(<Badge variant="success">Active</Badge>);

    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});
