import type { Product } from "@flowerp/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as apiClient from "../../lib/api-client";
import ProductsListPage from "./ProductsListPage";

function renderPage(initialEntry = "/products") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/products" element={<ProductsListPage />} />
          <Route path="/products/new" element={<p>Add product page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const PRODUCT: Product = {
  id: "prod-1",
  name: "Steel Bolt",
  sku: "BOLT-001",
  category: "Hardware",
  unitPrice: 4.5,
  currentStock: 2,
  minStockAlertQuantity: 10,
  location: "Warehouse A",
  isLowStock: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("ProductsListPage", () => {
  it("renders products returned by the list query, with a low-stock badge", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: [PRODUCT],
      meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("Steel Bolt")).toBeInTheDocument());
    expect(screen.getByText("BOLT-001")).toBeInTheDocument();
    expect(screen.getByText("Low stock")).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("shows the empty message when no products match", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: [],
      meta: { pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("No products found.")).toBeInTheDocument());

    vi.restoreAllMocks();
  });

  it("sends the lowStock filter when 'Low stock only' is selected", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: [],
      meta: { pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    });

    renderPage();

    await userEvent.selectOptions(screen.getByLabelText("Filter by stock level"), "true");

    await waitFor(() => {
      const call = vi
        .mocked(apiClient.apiRequest)
        .mock.calls.find(
          ([, options]) =>
            (options as { query?: { lowStock?: boolean } })?.query?.lowStock === true,
        );
      expect(call).toBeDefined();
    });

    vi.restoreAllMocks();
  });

  it("navigates to the add-product page", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: [],
      meta: { pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    });

    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Add Product" }));

    await waitFor(() => expect(screen.getByText("Add product page")).toBeInTheDocument());

    vi.restoreAllMocks();
  });
});
