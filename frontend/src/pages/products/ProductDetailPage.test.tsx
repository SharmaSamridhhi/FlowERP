import type { Product } from "@flowerp/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as apiClient from "../../lib/api-client";
import ProductDetailPage from "./ProductDetailPage";

function renderPage(initialEntry = "/products/prod-1") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/products/:id/edit" element={<p>Edit product page</p>} />
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
  currentStock: 50,
  minStockAlertQuantity: 10,
  location: "Warehouse A",
  isLowStock: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("ProductDetailPage", () => {
  it("renders all product fields", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({ data: PRODUCT });

    renderPage();

    await waitFor(() => expect(screen.getByText("Steel Bolt")).toBeInTheDocument());
    expect(screen.getByText("BOLT-001")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("Warehouse A")).toBeInTheDocument();
    expect(screen.getByText("In stock")).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("shows a low-stock warning when applicable", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: { ...PRODUCT, currentStock: 2, isLowStock: true },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("Steel Bolt")).toBeInTheDocument());
    expect(
      screen.getByText(/Current stock is at or below the minimum alert quantity/),
    ).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("renders an error message when the product fails to load", async () => {
    vi.spyOn(apiClient, "apiRequest").mockRejectedValue(
      new apiClient.ApiError(404, "NOT_FOUND", "Product not found"),
    );

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Product not found");

    vi.restoreAllMocks();
  });

  it("navigates to the edit page", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({ data: PRODUCT });

    renderPage();

    await waitFor(() => expect(screen.getByText("Steel Bolt")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    await waitFor(() => expect(screen.getByText("Edit product page")).toBeInTheDocument());

    vi.restoreAllMocks();
  });
});
