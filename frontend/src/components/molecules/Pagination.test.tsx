import type { PaginationMeta } from "@flowerp/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "./Pagination";

const MIDDLE_PAGE: PaginationMeta = { page: 2, limit: 10, total: 45, totalPages: 5 };

describe("Pagination", () => {
  it("renders the current page, total pages, and total count", () => {
    render(<Pagination meta={MIDDLE_PAGE} onPageChange={vi.fn()} />);

    expect(screen.getByText("Page 2 of 5 (45 total)")).toBeInTheDocument();
  });

  it("calls onPageChange with the next page number when Next is clicked", async () => {
    const onPageChange = vi.fn();
    render(<Pagination meta={MIDDLE_PAGE} onPageChange={onPageChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("calls onPageChange with the previous page number when Previous is clicked", async () => {
    const onPageChange = vi.fn();
    render(<Pagination meta={MIDDLE_PAGE} onPageChange={onPageChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Previous" }));

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("disables Previous on the first page and Next on the last page", () => {
    const { rerender } = render(
      <Pagination meta={{ page: 1, limit: 10, total: 45, totalPages: 5 }} onPageChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();

    rerender(
      <Pagination meta={{ page: 5, limit: 10, total: 45, totalPages: 5 }} onPageChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
  });
});
