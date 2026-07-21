import type { SalesChallan } from "@flowerp/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as apiClient from "../../lib/api-client";
import ChallansListPage from "./ChallansListPage";

function renderPage(initialEntry = "/challans") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/challans" element={<ChallansListPage />} />
          <Route path="/challans/new" element={<p>New challan page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const CHALLAN: SalesChallan = {
  id: "ch-1",
  challanNumber: "CH-2026-000001",
  status: "DRAFT",
  totalQuantity: 5,
  customerId: "cust-1",
  customerName: "Acme Distribution",
  createdById: "user-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("ChallansListPage", () => {
  it("renders challans returned by the list query", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: [CHALLAN],
      meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("CH-2026-000001")).toBeInTheDocument());
    expect(screen.getByText("Acme Distribution")).toBeInTheDocument();
    expect(screen.getByText("DRAFT")).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("shows the empty message when no challans match", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: [],
      meta: { pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("No sales challans found.")).toBeInTheDocument());

    vi.restoreAllMocks();
  });

  it("sends the status filter when a status is selected", async () => {
    const spy = vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: [],
      meta: { pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    });

    renderPage();

    await userEvent.selectOptions(screen.getByLabelText("Filter by status"), "CONFIRMED");

    await waitFor(() => {
      const call = spy.mock.calls.find(
        ([, options]) =>
          (options as { query?: { status?: string } })?.query?.status === "CONFIRMED",
      );
      expect(call).toBeDefined();
    });

    vi.restoreAllMocks();
  });

  it("navigates to the new-challan page", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: [],
      meta: { pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    });

    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "New Challan" }));

    await waitFor(() => expect(screen.getByText("New challan page")).toBeInTheDocument());

    vi.restoreAllMocks();
  });
});
