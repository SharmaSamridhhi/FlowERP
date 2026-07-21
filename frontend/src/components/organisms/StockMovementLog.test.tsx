import type { StockMovement } from "@flowerp/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import * as apiClient from "../../lib/api-client";
import { StockMovementLog } from "./StockMovementLog";

function renderLog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <StockMovementLog productId="prod-1" />
    </QueryClientProvider>,
  );
}

const MOVEMENT: StockMovement = {
  id: "move-1",
  productId: "prod-1",
  quantity: 10,
  type: "IN",
  reason: "Initial stock",
  sourceType: "MANUAL",
  sourceId: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  createdById: "user-1",
  createdByName: "Warehouse User",
};

describe("StockMovementLog", () => {
  it("renders movements returned by the query", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: [MOVEMENT],
      meta: { pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } },
    });

    renderLog();

    await waitFor(() => expect(screen.getByText("Initial stock")).toBeInTheDocument());
    expect(screen.getByText("Warehouse User")).toBeInTheDocument();
    expect(screen.getByText("IN")).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("shows the empty message when there are no movements", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: [],
      meta: { pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } },
    });

    renderLog();

    await waitFor(() =>
      expect(screen.getByText("No stock movements recorded yet.")).toBeInTheDocument(),
    );

    vi.restoreAllMocks();
  });

  it("requests the next page when Next is clicked", async () => {
    const spy = vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: [MOVEMENT],
      meta: { pagination: { page: 1, limit: 10, total: 20, totalPages: 2 } },
    });

    renderLog();

    await waitFor(() => expect(screen.getByText("Initial stock")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        "/products/prod-1/stock-movements",
        expect.objectContaining({ query: expect.objectContaining({ page: 2 }) }),
      ),
    );

    vi.restoreAllMocks();
  });
});
