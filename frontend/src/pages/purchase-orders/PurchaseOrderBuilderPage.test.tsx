import type { Product, PurchaseOrderWithItems } from "@flowerp/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as apiClient from "../../lib/api-client";
import { ToastProvider } from "../../lib/toast-context";
import PurchaseOrderBuilderPage from "./PurchaseOrderBuilderPage";

function renderPage(initialEntry = "/purchase-orders/new") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/purchase-orders/new" element={<PurchaseOrderBuilderPage />} />
            <Route path="/purchase-orders/:id/edit" element={<PurchaseOrderBuilderPage />} />
            <Route path="/purchase-orders/:id" element={<p>PO detail page</p>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
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
  minStockAlertQuantity: 5,
  location: null,
  isLowStock: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function draftPO(overrides: Partial<PurchaseOrderWithItems> = {}): PurchaseOrderWithItems {
  return {
    id: "po-1",
    poNumber: "PO-2026-000001",
    supplierName: "Acme Wholesale",
    status: "DRAFT",
    totalQuantity: 2,
    totalCost: 20,
    createdById: "user-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    items: [
      {
        id: "item-1",
        productId: PRODUCT.id,
        productNameSnapshot: PRODUCT.name,
        productSkuSnapshot: PRODUCT.sku,
        unitCost: 10,
        quantity: 2,
      },
    ],
    ...overrides,
  };
}

async function fillSupplierAndAddProduct() {
  await userEvent.type(screen.getByLabelText(/^Supplier name/), "Acme Wholesale");

  await userEvent.type(screen.getByLabelText("Add product"), "Steel");
  await waitFor(() => expect(screen.getByText("Steel Bolt")).toBeInTheDocument());
  await userEvent.click(screen.getByText("Steel Bolt"));
}

describe("PurchaseOrderBuilderPage", () => {
  it("requires a supplier name and at least one product before saving", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({ data: [] });

    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Save as Draft" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a supplier name.");

    vi.restoreAllMocks();
  });

  it("creates a Draft PO and navigates to its detail page", async () => {
    const spy = vi.spyOn(apiClient, "apiRequest").mockImplementation((path, options) => {
      if (path === "/products") return Promise.resolve({ data: [PRODUCT] });
      if (path === "/purchase-orders" && options?.method === "POST") {
        return Promise.resolve({ data: draftPO() });
      }
      return Promise.resolve({ data: {} });
    });

    renderPage();

    await fillSupplierAndAddProduct();
    await userEvent.click(screen.getByRole("button", { name: "Save as Draft" }));

    await waitFor(() => expect(screen.getByText("PO detail page")).toBeInTheDocument());
    expect(spy).toHaveBeenCalledWith(
      "/purchase-orders",
      expect.objectContaining({
        method: "POST",
        body: {
          supplierName: "Acme Wholesale",
          items: [{ productId: "prod-1", quantity: 1, unitCost: 0 }],
        },
      }),
    );

    vi.restoreAllMocks();
  });

  it("saves and receives in one action on success", async () => {
    vi.spyOn(apiClient, "apiRequest").mockImplementation((path, options) => {
      if (path === "/products") return Promise.resolve({ data: [PRODUCT] });
      if (path === "/purchase-orders" && options?.method === "POST") {
        return Promise.resolve({ data: draftPO() });
      }
      if (path === "/purchase-orders/po-1/receive") {
        return Promise.resolve({ data: draftPO({ status: "RECEIVED" }) });
      }
      return Promise.resolve({ data: {} });
    });

    renderPage();

    await fillSupplierAndAddProduct();
    await userEvent.click(screen.getByRole("button", { name: "Save & Receive" }));

    await waitFor(() => expect(screen.getByText("PO detail page")).toBeInTheDocument());

    vi.restoreAllMocks();
  });

  it("redirects to the read-only detail view when editing a non-Draft PO", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({ data: draftPO({ status: "RECEIVED" }) });

    renderPage("/purchase-orders/po-1/edit");

    await waitFor(() => expect(screen.getByText("PO detail page")).toBeInTheDocument());

    vi.restoreAllMocks();
  });

  it("prefills the builder with an existing Draft's supplier and line items", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({ data: draftPO() });

    renderPage("/purchase-orders/po-1/edit");

    await waitFor(() => expect(screen.getByDisplayValue("Acme Wholesale")).toBeInTheDocument());
    expect(screen.getByText("Steel Bolt")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity for Steel Bolt")).toHaveValue(2);
    expect(screen.getByLabelText("Unit cost for Steel Bolt")).toHaveValue(10);

    vi.restoreAllMocks();
  });
});
