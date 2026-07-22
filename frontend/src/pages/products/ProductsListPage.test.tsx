import type { Product } from "@flowerp/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as apiClient from "../../lib/api-client";
import { AuthContext } from "../../lib/auth-context";
import ProductsListPage from "./ProductsListPage";

function renderPage(
  role: "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS" = "ADMIN",
  initialEntry = "/products",
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
            <Route path="/products" element={<ProductsListPage />} />
            <Route path="/products/new" element={<p>Add product page</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
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

    await userEvent.click(screen.getByRole("button", { name: "Add New Product" }));

    await waitFor(() => expect(screen.getByText("Add product page")).toBeInTheDocument());

    vi.restoreAllMocks();
  });

  it("disables (not hides) Add Product for a role that can't write products, with an explanation", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: [],
      meta: { pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    });

    renderPage("SALES");

    await waitFor(() => expect(screen.getByText("No products found.")).toBeInTheDocument());
    const addButton = screen.getByRole("button", { name: "Add New Product" });
    expect(addButton).toBeDisabled();
    expect(addButton).toHaveAttribute("title", "Only Admin and Warehouse can do this.");

    vi.restoreAllMocks();
  });
});
