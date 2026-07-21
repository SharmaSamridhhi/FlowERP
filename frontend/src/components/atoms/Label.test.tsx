import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Label } from "./Label";

describe("Label", () => {
  it("renders its text", () => {
    render(<Label htmlFor="name">Name</Label>);

    expect(screen.getByText("Name")).toBeInTheDocument();
  });

  it("shows a required indicator when required", () => {
    render(<Label required>Name</Label>);

    expect(screen.getByText("*")).toBeInTheDocument();
  });
});
