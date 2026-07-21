import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthLayoutTemplate } from "./AuthLayoutTemplate";

describe("AuthLayoutTemplate", () => {
  it("renders the title and content", () => {
    render(
      <AuthLayoutTemplate title="Log in">
        <p>Form goes here</p>
      </AuthLayoutTemplate>,
    );

    expect(screen.getByRole("heading", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByText("Form goes here")).toBeInTheDocument();
  });
});
