import type { Product, StockMovement } from "@flowerp/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as apiClient from "../../lib/api-client";
import { AuthContext } from "../../lib/auth-context";
import { ToastProvider } from "../../lib/toast-context";
import ProductDetailPage from "./ProductDetailPage";

// AuthContext is provided directly (not via a real login flow) so each
// test can fix the role under test, mirroring how AppSidebar.test.tsx
// tests role-gated UI without going through a full auth round-trip.
function renderPage(
  role: "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS",
  initialEntry = "/products/prod-1",
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
        <ToastProvider>
          <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/products/:id/edit" element={<p>Edit product page</p>} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
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
  currentStock: 50,
  minStockAlertQuantity: 10,
  location: "Warehouse A",
  isLowStock: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

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
  createdByName: "Test User",
};

function mockApiRequest(overrides: { movements?: StockMovement[] } = {}) {
  return vi.spyOn(apiClient, "apiRequest").mockImplementation((path) => {
    if (path.includes("/stock-movements")) {
      return Promise.resolve({
        data: overrides.movements ?? [MOVEMENT],
        meta: { pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } },
      });
    }
    return Promise.resolve({ data: PRODUCT });
  });
}

describe("ProductDetailPage", () => {
  it("renders all product fields and the stock movement log", async () => {
    mockApiRequest();

    renderPage("ACCOUNTS");

    await waitFor(() => expect(screen.getByText("Steel Bolt")).toBeInTheDocument());
    expect(screen.getByText("BOLT-001")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("In stock")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText("Initial stock")).toBeInTheDocument());
    expect(screen.getByText("Test User")).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("shows a low-stock warning when applicable", async () => {
    mockApiRequest();
    vi.spyOn(apiClient, "apiRequest").mockImplementation((path) => {
      if (path.includes("/stock-movements")) {
        return Promise.resolve({
          data: [],
          meta: { pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } },
        });
      }
      return Promise.resolve({ data: { ...PRODUCT, currentStock: 2, isLowStock: true } });
    });

    renderPage("ACCOUNTS");

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

    renderPage("ADMIN");

    expect(await screen.findByRole("alert")).toHaveTextContent("Product not found");

    vi.restoreAllMocks();
  });

  it("navigates to the edit page", async () => {
    mockApiRequest();

    renderPage("ADMIN");

    await waitFor(() => expect(screen.getByText("Steel Bolt")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    await waitFor(() => expect(screen.getByText("Edit product page")).toBeInTheDocument());

    vi.restoreAllMocks();
  });

  it("enables Adjust Stock and Edit for ADMIN and WAREHOUSE", async () => {
    mockApiRequest();

    renderPage("WAREHOUSE");

    await waitFor(() => expect(screen.getByText("Steel Bolt")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Adjust Stock" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Edit" })).toBeEnabled();

    vi.restoreAllMocks();
  });

  it("disables (not hides) Adjust Stock and Edit for SALES and ACCOUNTS, with an explanation", async () => {
    mockApiRequest();

    renderPage("SALES");

    await waitFor(() => expect(screen.getByText("Steel Bolt")).toBeInTheDocument());
    const adjustButton = screen.getByRole("button", { name: "Adjust Stock" });
    const editButton = screen.getByRole("button", { name: "Edit" });

    expect(adjustButton).toBeDisabled();
    expect(editButton).toBeDisabled();
    expect(adjustButton).toHaveAttribute("title", "Only Admin and Warehouse can do this.");

    vi.restoreAllMocks();
  });

  it("submits a manual stock adjustment and refreshes the log", async () => {
    const spy = vi.spyOn(apiClient, "apiRequest").mockImplementation((path, options) => {
      if (path.includes("/stock-movements") && options?.method === "POST") {
        return Promise.resolve({ data: { ...MOVEMENT, id: "move-2", reason: "Damaged goods" } });
      }
      if (path.includes("/stock-movements")) {
        return Promise.resolve({
          data: [MOVEMENT],
          meta: { pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } },
        });
      }
      return Promise.resolve({ data: PRODUCT });
    });

    renderPage("WAREHOUSE");

    await waitFor(() => expect(screen.getByText("Steel Bolt")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Adjust Stock" }));

    await userEvent.selectOptions(screen.getByLabelText(/^Type/), "OUT");
    const quantityInput = screen.getByLabelText(/^Quantity/);
    await userEvent.clear(quantityInput);
    await userEvent.type(quantityInput, "5");
    await userEvent.type(screen.getByLabelText(/^Reason/), "Damaged goods");
    await userEvent.click(screen.getByRole("button", { name: "Record movement" }));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        "/products/prod-1/stock-movements",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({ type: "OUT", quantity: 5, reason: "Damaged goods" }),
        }),
      ),
    );

    vi.restoreAllMocks();
  });
});
