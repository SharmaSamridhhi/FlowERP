import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchSelect } from "./SearchSelect";
import type { SearchSelectOption } from "./SearchSelect";

const OPTIONS: SearchSelectOption[] = [
  { value: "prod-1", label: "Steel Bolt", hint: "BOLT-001" },
  { value: "prod-2", label: "Copper Wire", hint: "WIRE-001" },
];

describe("SearchSelect", () => {
  it("does not show a dropdown until there is a query", () => {
    render(
      <SearchSelect
        aria-label="Search products"
        query=""
        onQueryChange={vi.fn()}
        options={OPTIONS}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.queryByText("Steel Bolt")).not.toBeInTheDocument();
  });

  it("shows matching options once focused with a query", async () => {
    render(
      <SearchSelect
        aria-label="Search products"
        query="steel"
        onQueryChange={vi.fn()}
        options={OPTIONS}
        onSelect={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByLabelText("Search products"));

    expect(screen.getByText("Steel Bolt")).toBeInTheDocument();
    expect(screen.getByText("Copper Wire")).toBeInTheDocument();
  });

  it("calls onQueryChange as the user types", async () => {
    const onQueryChange = vi.fn();
    render(
      <SearchSelect
        aria-label="Search products"
        query=""
        onQueryChange={onQueryChange}
        options={[]}
        onSelect={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText("Search products"), "st");

    expect(onQueryChange).toHaveBeenCalledWith("s");
    expect(onQueryChange).toHaveBeenCalledWith("t");
  });

  it("calls onSelect with the chosen option and clears the dropdown", async () => {
    const onSelect = vi.fn();
    render(
      <SearchSelect
        aria-label="Search products"
        query="steel"
        onQueryChange={vi.fn()}
        options={OPTIONS}
        onSelect={onSelect}
      />,
    );

    await userEvent.click(screen.getByLabelText("Search products"));
    await userEvent.click(screen.getByText("Steel Bolt"));

    expect(onSelect).toHaveBeenCalledWith(OPTIONS[0]);
    await waitFor(() => expect(screen.queryByText("Copper Wire")).not.toBeInTheDocument());
  });

  it("shows a loading state instead of options", async () => {
    render(
      <SearchSelect
        aria-label="Search products"
        query="steel"
        onQueryChange={vi.fn()}
        options={[]}
        onSelect={vi.fn()}
        isLoading
      />,
    );

    await userEvent.click(screen.getByLabelText("Search products"));

    expect(screen.getByText("Searching...")).toBeInTheDocument();
  });

  it("shows a custom empty message when there are no matches", async () => {
    render(
      <SearchSelect
        aria-label="Search products"
        query="zzz"
        onQueryChange={vi.fn()}
        options={[]}
        onSelect={vi.fn()}
        emptyMessage="No products match."
      />,
    );

    await userEvent.click(screen.getByLabelText("Search products"));

    expect(screen.getByText("No products match.")).toBeInTheDocument();
  });
});
