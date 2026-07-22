import type { Customer, Product, SalesChallanWithItems } from "@flowerp/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as apiClient from "../../lib/api-client";
import { ToastProvider } from "../../lib/toast-context";
import ChallanBuilderPage from "./ChallanBuilderPage";

function renderPage(initialEntry = "/challans/new") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/challans/new" element={<ChallanBuilderPage />} />
            <Route path="/challans/:id/edit" element={<ChallanBuilderPage />} />
            <Route path="/challans/:id" element={<p>Challan detail page</p>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const CUSTOMER: Customer = {
  id: "cust-1",
  name: "Acme Distribution",
  mobile: "9800000001",
  email: null,
  businessName: null,
  gstNumber: null,
  type: "WHOLESALE",
  address: null,
  status: "ACTIVE",
  followUpDate: null,
  notes: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const PRODUCT: Product = {
  id: "prod-1",
  name: "Steel Bolt",
  sku: "BOLT-001",
  category: "Hardware",
  unitPrice: 4.5,
  currentStock: 50,
  minStockAlertQuantity: 5,
  location: null,
  imageUrl: null,
  isLowStock: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function draftChallan(overrides: Partial<SalesChallanWithItems> = {}): SalesChallanWithItems {
  return {
    id: "ch-1",
    challanNumber: "CH-2026-000001",
    status: "DRAFT",
    totalQuantity: 2,
    totalAmount: 9,
    customerId: CUSTOMER.id,
    customerName: CUSTOMER.name,
    createdById: "user-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    items: [
      {
        id: "item-1",
        productId: PRODUCT.id,
        productNameSnapshot: PRODUCT.name,
        productSkuSnapshot: PRODUCT.sku,
        unitPriceSnapshot: PRODUCT.unitPrice,
        quantity: 2,
      },
    ],
    ...overrides,
  };
}

async function selectCustomerAndProduct() {
  await userEvent.type(screen.getByLabelText("Customer"), "Acme");
  await waitFor(() => expect(screen.getByText("Acme Distribution")).toBeInTheDocument());
  await userEvent.click(screen.getByText("Acme Distribution"));

  await userEvent.type(screen.getByLabelText("Add product"), "Steel");
  await waitFor(() => expect(screen.getByText("Steel Bolt")).toBeInTheDocument());
  await userEvent.click(screen.getByText("Steel Bolt"));
}

describe("ChallanBuilderPage", () => {
  it("requires a customer and at least one product before saving", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({ data: [] });

    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Save as Draft" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Select a customer.");

    vi.restoreAllMocks();
  });

  it("creates a Draft challan and navigates to its detail page", async () => {
    const spy = vi.spyOn(apiClient, "apiRequest").mockImplementation((path, options) => {
      if (path === "/customers") return Promise.resolve({ data: [CUSTOMER] });
      if (path === "/products") return Promise.resolve({ data: [PRODUCT] });
      if (path === "/challans" && options?.method === "POST") {
        return Promise.resolve({ data: draftChallan() });
      }
      return Promise.resolve({ data: {} });
    });

    renderPage();

    await selectCustomerAndProduct();
    await userEvent.click(screen.getByRole("button", { name: "Save as Draft" }));

    await waitFor(() => expect(screen.getByText("Challan detail page")).toBeInTheDocument());
    expect(spy).toHaveBeenCalledWith(
      "/challans",
      expect.objectContaining({
        method: "POST",
        body: { customerId: "cust-1", items: [{ productId: "prod-1", quantity: 1 }] },
      }),
    );

    vi.restoreAllMocks();
  });

  it("saves and confirms in one action on success", async () => {
    vi.spyOn(apiClient, "apiRequest").mockImplementation((path, options) => {
      if (path === "/customers") return Promise.resolve({ data: [CUSTOMER] });
      if (path === "/products") return Promise.resolve({ data: [PRODUCT] });
      if (path === "/challans" && options?.method === "POST") {
        return Promise.resolve({ data: draftChallan() });
      }
      if (path === "/challans/ch-1/confirm") {
        return Promise.resolve({ data: draftChallan({ status: "CONFIRMED" }) });
      }
      return Promise.resolve({ data: {} });
    });

    renderPage();

    await selectCustomerAndProduct();
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(screen.getByText("Challan detail page")).toBeInTheDocument());

    vi.restoreAllMocks();
  });

  it("shows the insufficient-stock error against the specific line item and stays on the builder", async () => {
    vi.spyOn(apiClient, "apiRequest").mockImplementation((path, options) => {
      if (path === "/customers") return Promise.resolve({ data: [CUSTOMER] });
      if (path === "/products") return Promise.resolve({ data: [PRODUCT] });
      if (path === "/challans" && options?.method === "POST") {
        return Promise.resolve({ data: draftChallan() });
      }
      if (path === "/challans/ch-1/confirm") {
        return Promise.reject(
          new apiClient.ApiError(409, "CONFLICT", "Insufficient stock for: Steel Bolt", [
            {
              productId: "prod-1",
              productName: "Steel Bolt",
              requestedQuantity: 2,
              availableQuantity: 1,
            },
          ]),
        );
      }
      // The builder redirects into edit mode (/challans/ch-1/edit) after a
      // save-then-confirm failure, which remounts this page and refetches
      // the now-saved draft.
      if (path === "/challans/ch-1") {
        return Promise.resolve({ data: draftChallan() });
      }
      return Promise.resolve({ data: {} });
    });

    renderPage();

    await selectCustomerAndProduct();
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      const alerts = screen.getAllByRole("alert");
      const rowAlert = alerts.find((el) => el.textContent?.includes("available (requested"));
      expect(rowAlert?.textContent).toContain("Only 1 available (requested 2)");
    });
    expect(screen.queryByText("Challan detail page")).not.toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("redirects to the read-only detail view when editing a non-Draft challan", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      data: draftChallan({ status: "CONFIRMED" }),
    });

    renderPage("/challans/ch-1/edit");

    await waitFor(() => expect(screen.getByText("Challan detail page")).toBeInTheDocument());

    vi.restoreAllMocks();
  });

  it("prefills the builder with an existing Draft's customer and line items", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({ data: draftChallan() });

    renderPage("/challans/ch-1/edit");

    await waitFor(() => expect(screen.getByText("Acme Distribution")).toBeInTheDocument());
    expect(screen.getByText("Steel Bolt")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity for Steel Bolt")).toHaveValue(2);

    vi.restoreAllMocks();
  });
});
