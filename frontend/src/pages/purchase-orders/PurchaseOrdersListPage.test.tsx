import type { PurchaseOrder } from "@flowerp/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as apiClient from "../../lib/api-client";
import { AuthContext } from "../../lib/auth-context";
import PurchaseOrdersListPage from "./PurchaseOrdersListPage";

function renderPage(
  role: "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS" = "ADMIN",
  initialEntry = "/purchase-orders",
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          user: { id: "user-1", name: "Test User", email: "test@flowerp.test", role },
          isInitializing: false,
          login: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/purchase-orders" element={<PurchaseOrdersListPage />} />
            <Route path="/purchase-orders/new" element={<p>New PO page</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

const PO: PurchaseOrder = {
  id: "po-1",
  poNumber: "PO-2026-000001",
  supplierName: "Acme Wholesale",
  status: "DRAFT",
  totalQuantity: 5,
  totalCost: 50,
  createdById: "user-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("PurchaseOrdersListPage", () => {
  it("renders purchase orders returned by the list query", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: [PO],
      meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("PO-2026-000001")).toBeInTheDocument());
    expect(screen.getByText("Acme Wholesale")).toBeInTheDocument();
    expect(screen.getByText("DRAFT")).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("shows the empty message when no purchase orders match", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: [],
      meta: { pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("No purchase orders found.")).toBeInTheDocument());

    vi.restoreAllMocks();
  });

  it("sends the status filter when a status is selected", async () => {
    const spy = vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: [],
      meta: { pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    });

    renderPage();

    await userEvent.selectOptions(screen.getByLabelText("Filter by status"), "RECEIVED");

    await waitFor(() => {
      const call = spy.mock.calls.find(
        ([, options]) => (options as { query?: { status?: string } })?.query?.status === "RECEIVED",
      );
      expect(call).toBeDefined();
    });

    vi.restoreAllMocks();
  });

  it("navigates to the new-PO page", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: [],
      meta: { pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    });

    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "New Purchase Order" }));

    await waitFor(() => expect(screen.getByText("New PO page")).toBeInTheDocument());

    vi.restoreAllMocks();
  });

  it("disables (not hides) New Purchase Order for a role that can't write POs, with an explanation", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: [],
      meta: { pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    });

    renderPage("SALES");

    await waitFor(() => expect(screen.getByText("No purchase orders found.")).toBeInTheDocument());
    const addButton = screen.getByRole("button", { name: "New Purchase Order" });
    expect(addButton).toBeDisabled();
    expect(addButton).toHaveAttribute("title", "Only Admin and Warehouse can do this.");

    vi.restoreAllMocks();
  });
});
